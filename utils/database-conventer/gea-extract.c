#include "gea/lzge.h"

#include <ctype.h>
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define GEA_HEADER_FIXED_SIZE 73U
#define GEA_FILE_FIXED_SIZE 30U
#define GEA_COMPRESSED_DESCRIPTIONS 0x0002U
#define GEA_PASSWORDS 0x0001U
#define GEA_FILE_ATTRIB 0x0001U
#define GEA_FILE_FOLDER 0x0010U
#define GEA_FILE_VERSION 0x0020U
#define GEA_FILE_GROUP 0x0040U
#define GEA_FILE_PROTECT 0x0080U
#define GEA_STORE 0U
#define GEA_LZGE 1U
#define GEA_UNIT 0x40000U
#define MINIMUM_DBF_RECORDS 10000U

typedef struct {
  const uint8_t *input;
  uint64_t input_size;
  uint64_t archive_offset;
  uint32_t flags;
  uint32_t header_size;
  uint32_t info_size;
  uint32_t moved_size;
  uint32_t block_size;
  uint32_t solid_size;
  uint64_t summary_size;
  uint64_t main_data_size;
  const uint8_t *metadata;
  uint8_t *owned_metadata;
} GeaArchive;

typedef struct {
  uint16_t flags;
  uint64_t size;
  uint64_t compressed_size;
  uint32_t crc;
  uint64_t data_offset;
  char name[256];
  char folder[512];
} GeaFile;

dword STDCALL fgeauser(dword param, dword userfunc, dword pgeaparam) {
  (void)param;
  (void)userfunc;
  (void)pgeaparam;
  return 1;
}

static uint16_t read_u16(const uint8_t *data) {
  return (uint16_t)data[0] | ((uint16_t)data[1] << 8);
}

static uint32_t read_u32(const uint8_t *data) {
  return (uint32_t)data[0] | ((uint32_t)data[1] << 8) |
         ((uint32_t)data[2] << 16) | ((uint32_t)data[3] << 24);
}

static uint64_t read_u64(const uint8_t *data) {
  return (uint64_t)read_u32(data) | ((uint64_t)read_u32(data + 4) << 32);
}

static int ascii_equal(const char *left, const char *right) {
  while (*left && *right) {
    if (tolower((unsigned char)*left) != tolower((unsigned char)*right)) return 0;
    left++;
    right++;
  }
  return *left == '\0' && *right == '\0';
}

static int checked_range(uint64_t offset, uint64_t size, uint64_t limit) {
  return offset <= limit && size <= limit - offset;
}

static int copy_cstring(char *destination, size_t capacity, const uint8_t *data,
                        uint64_t limit, uint64_t *position) {
  uint64_t start = *position;
  while (*position < limit && data[*position] != '\0') (*position)++;
  if (*position == limit || *position - start >= capacity) return 0;
  memcpy(destination, data + start, (size_t)(*position - start));
  destination[*position - start] = '\0';
  (*position)++;
  return 1;
}

static int locate_archive(const uint8_t *input, uint64_t input_size,
                          GeaArchive *archive) {
  int found = 0;
  for (uint64_t offset = 0; offset + GEA_HEADER_FIXED_SIZE <= input_size; offset++) {
    if (memcmp(input + offset, "GEA\0", 4) != 0) continue;

    const uint8_t *header = input + offset;
    uint8_t major = header[10];
    uint8_t minor = header[11];
    uint32_t flags = read_u32(header + 20);
    uint16_t volumes = read_u16(header + 24);
    uint32_t header_size = read_u32(header + 26);
    uint64_t summary_size = read_u64(header + 30);
    uint32_t info_size = read_u32(header + 38);
    uint64_t gea_size = read_u64(header + 42);
    uint32_t moved_size = read_u32(header + 66);
    uint8_t block_units = header[71];
    uint8_t solid_units = header[72];

    if (major != 2 || minor != 0 || volumes != 1 || info_size == 0 ||
        header_size < GEA_HEADER_FIXED_SIZE || block_units == 0 ||
        gea_size != input_size ||
        !checked_range(offset, (uint64_t)header_size + moved_size, input_size)) {
      continue;
    }

    uint64_t main_data_size =
        input_size - offset - (uint64_t)header_size - moved_size;
    if (summary_size != main_data_size + moved_size) continue;

    if (!found || summary_size > archive->summary_size) {
      archive->input = input;
      archive->input_size = input_size;
      archive->archive_offset = offset;
      archive->flags = flags;
      archive->header_size = header_size;
      archive->info_size = info_size;
      archive->moved_size = moved_size;
      archive->block_size = (uint32_t)block_units * GEA_UNIT;
      archive->solid_size = (uint32_t)solid_units * GEA_UNIT;
      archive->summary_size = summary_size;
      archive->main_data_size = main_data_size;
      found = 1;
    }
  }
  return found;
}

static int read_metadata(GeaArchive *archive) {
  const uint8_t *base = archive->input + archive->archive_offset;
  uint64_t position = GEA_HEADER_FIXED_SIZE;

  while (position < archive->header_size && base[position] != '\0') position++;
  if (position == archive->header_size) return 0;
  position++;

  if (archive->flags & GEA_PASSWORDS) {
    fprintf(stderr, "Password-protected GEA archives are not supported\n");
    return 0;
  }

  if (archive->flags & GEA_COMPRESSED_DESCRIPTIONS) {
    archive->owned_metadata = calloc(1, (size_t)archive->info_size + 64U);
    if (!archive->owned_metadata) return 0;
    slzge decoder = {0};
    dword consumed = lzge_decode((pbyte)(base + position),
                                 archive->owned_metadata,
                                 archive->info_size, &decoder);
    if (consumed == 0 || position + consumed > (uint64_t)archive->header_size + 1U) return 0;
    archive->metadata = archive->owned_metadata;
  } else {
    if (!checked_range(position, archive->info_size, archive->header_size)) return 0;
    archive->metadata = base + position;
  }
  return 1;
}

static int find_database(const GeaArchive *archive, GeaFile *database) {
  uint64_t position = 0;
  uint64_t data_offset = 0;
  char current_folder[sizeof(database->folder)] = "";
  unsigned matches = 0;

  while (position < archive->info_size) {
    if (!checked_range(position, GEA_FILE_FIXED_SIZE, archive->info_size)) return 0;
    const uint8_t *record = archive->metadata + position;
    GeaFile file = {0};
    file.flags = read_u16(record);
    file.size = read_u64(record + 10);
    file.compressed_size = read_u64(record + 18);
    file.crc = read_u32(record + 26);
    file.data_offset = data_offset;
    position += GEA_FILE_FIXED_SIZE;

    uint64_t optional_size = 0;
    if (file.flags & GEA_FILE_ATTRIB) optional_size += 4;
    if (file.flags & GEA_FILE_VERSION) optional_size += 8;
    if (file.flags & GEA_FILE_GROUP) optional_size += 4;
    if (file.flags & GEA_FILE_PROTECT) optional_size += 4;
    if (!checked_range(position, optional_size, archive->info_size)) return 0;
    position += optional_size;

    if (!copy_cstring(file.name, sizeof(file.name), archive->metadata,
                      archive->info_size, &position)) return 0;
    if (file.flags & GEA_FILE_FOLDER) {
      if (!copy_cstring(current_folder, sizeof(current_folder), archive->metadata,
                        archive->info_size, &position)) return 0;
    }
    memcpy(file.folder, current_folder, sizeof(file.folder));

    if (!checked_range(data_offset, file.compressed_size, archive->summary_size)) return 0;
    data_offset += file.compressed_size;

    if (ascii_equal(file.name, "rall1.dbf") && ascii_equal(file.folder, "DBF")) {
      *database = file;
      matches++;
    }
  }

  return position == archive->info_size && data_offset == archive->summary_size &&
         matches == 1;
}

static int logical_copy(const GeaArchive *archive, uint64_t offset,
                        uint8_t *destination, uint64_t size) {
  if (!checked_range(offset, size, archive->summary_size)) return 0;

  while (size > 0) {
    uint64_t available;
    const uint8_t *source;
    if (offset < archive->main_data_size) {
      available = archive->main_data_size - offset;
      source = archive->input + archive->archive_offset + archive->header_size +
               archive->moved_size + offset;
    } else {
      uint64_t moved_offset = offset - archive->main_data_size;
      available = archive->moved_size - moved_offset;
      source = archive->input + archive->archive_offset + archive->header_size +
               moved_offset;
    }
    uint64_t chunk = size < available ? size : available;
    if (chunk == 0) return 0;
    memcpy(destination, source, (size_t)chunk);
    destination += chunk;
    offset += chunk;
    size -= chunk;
  }
  return 1;
}

static uint32_t crc_update(uint32_t crc, const uint8_t *data, size_t size) {
  for (size_t index = 0; index < size; index++) {
    crc ^= data[index];
    for (unsigned bit = 0; bit < 8; bit++) {
      crc = (crc >> 1) ^ (0xedb88320U & (uint32_t)-(int32_t)(crc & 1U));
    }
  }
  return crc;
}

static int validate_dbf(FILE *output, uint64_t expected_size) {
  uint8_t header[32];
  if (fflush(output) != 0 || fseek(output, 0, SEEK_SET) != 0 ||
      fread(header, 1, sizeof(header), output) != sizeof(header)) return 0;
  uint32_t records = read_u32(header + 4);
  uint16_t header_size = read_u16(header + 8);
  uint16_t record_size = read_u16(header + 10);
  uint64_t minimum_size = (uint64_t)header_size + (uint64_t)records * record_size;
  return header[0] == 0x30 && records >= MINIMUM_DBF_RECORDS &&
         header_size >= 33 && record_size > 0 && expected_size >= minimum_size &&
         expected_size <= minimum_size + 1;
}

static int extract_database(const GeaArchive *archive, const GeaFile *database,
                            const char *destination) {
  if (database->flags & GEA_FILE_PROTECT || database->compressed_size > SIZE_MAX ||
      database->size > SIZE_MAX) return 0;

  uint8_t *compressed = malloc((size_t)database->compressed_size + 64U);
  uint8_t *output = calloc(1, (size_t)archive->block_size + archive->solid_size + 64U);
  char *temporary = malloc(strlen(destination) + 5U);
  if (!compressed || !output || !temporary) {
    free(compressed); free(output); free(temporary); return 0;
  }
  sprintf(temporary, "%s.tmp", destination);

  if (!logical_copy(archive, database->data_offset, compressed,
                    database->compressed_size)) {
    free(compressed); free(output); free(temporary); return 0;
  }

  FILE *file = fopen(temporary, "w+b");
  if (!file) {
    fprintf(stderr, "Cannot create %s: %s\n", temporary, strerror(errno));
    free(compressed); free(output); free(temporary); return 0;
  }

  uint64_t input_position = 0;
  uint64_t remaining = database->size;
  uint32_t output_used = 0;
  uint32_t crc = 0xffffffffU;
  int success = 1;

  while (remaining > 0 && success) {
    if (!checked_range(input_position, 9, database->compressed_size)) {
      success = 0; break;
    }
    uint8_t order = compressed[input_position] & 0x7fU;
    uint64_t packed_size = read_u64(compressed + input_position + 1);
    input_position += 9;
    if (packed_size > UINT32_MAX ||
        !checked_range(input_position, packed_size, database->compressed_size)) {
      success = 0; break;
    }

    uint32_t method = order >> 4;
    uint32_t compression_order = (order & 0x0fU) + 1U;
    uint32_t output_size = remaining < archive->block_size
                               ? (uint32_t)remaining : archive->block_size;
    uint32_t solid_offset = 0;

    if (method != GEA_LZGE || compression_order > 1) {
      output_used = 0;
    } else {
      if ((uint64_t)output_used + output_size >
          (uint64_t)archive->block_size + archive->solid_size) {
        uint32_t keep = output_used < archive->solid_size
                            ? output_used : archive->solid_size;
        memmove(output, output + output_used - keep, keep);
        output_used = keep;
      }
      solid_offset = output_used;
    }

    if (method == GEA_STORE) {
      if (packed_size != output_size) {
        success = 0; break;
      }
      memcpy(output, compressed + input_position, output_size);
      output_used = output_size;
    } else if (method == GEA_LZGE) {
      slzge decoder = {0};
      decoder.solidoff = solid_offset;
      dword consumed = lzge_decode(compressed + input_position, output,
                                   solid_offset + output_size, &decoder);
      if (consumed != packed_size) {
        success = 0; break;
      }
      output_used = solid_offset + output_size;
    } else {
      fprintf(stderr, "Unsupported GEA compression method: %u\n", method);
      success = 0; break;
    }

    if (fwrite(output + solid_offset, 1, output_size, file) != output_size) {
      success = 0; break;
    }
    crc = crc_update(crc, output + solid_offset, output_size);
    input_position += packed_size;
    remaining -= output_size;
  }

  if (input_position != database->compressed_size || crc != database->crc ||
      !validate_dbf(file, database->size)) success = 0;
  if (fclose(file) != 0) success = 0;

  if (success) {
    if (rename(temporary, destination) != 0) success = 0;
  }
  if (!success) remove(temporary);
  free(temporary);
  free(output);
  free(compressed);
  return success;
}

static uint8_t *read_file(const char *filename, uint64_t *size) {
  FILE *file = fopen(filename, "rb");
  if (!file) return NULL;
  if (fseek(file, 0, SEEK_END) != 0) { fclose(file); return NULL; }
  long length = ftell(file);
  if (length <= 0 || fseek(file, 0, SEEK_SET) != 0) { fclose(file); return NULL; }
  uint8_t *data = malloc((size_t)length);
  if (!data || fread(data, 1, (size_t)length, file) != (size_t)length) {
    free(data); fclose(file); return NULL;
  }
  fclose(file);
  *size = (uint64_t)length;
  return data;
}

int main(int argc, char **argv) {
  if (argc != 3) {
    fprintf(stderr, "Usage: %s <installer.exe> <rall1.dbf>\n", argv[0]);
    return 2;
  }

  uint64_t input_size = 0;
  uint8_t *input = read_file(argv[1], &input_size);
  GeaArchive archive = {0};
  GeaFile database = {0};
  int success = input && locate_archive(input, input_size, &archive) &&
                read_metadata(&archive) && find_database(&archive, &database);

  if (!success) {
    fprintf(stderr, "Could not find a supported GEA v2 DBF payload in %s\n", argv[1]);
  } else {
    printf("Found %s/%s (%llu bytes, %llu compressed)\n", database.folder,
           database.name, (unsigned long long)database.size,
           (unsigned long long)database.compressed_size);
    success = extract_database(&archive, &database, argv[2]);
    if (!success) {
      fprintf(stderr, "GEA extraction or DBF validation failed\n");
    } else {
      printf("Extracted and validated %s\n", argv[2]);
    }
  }

  free(archive.owned_metadata);
  free(input);
  return success ? 0 : 1;
}
