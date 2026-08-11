CC ?= cc
CFLAGS ?= -O2
CFLAGS += -std=c11 -Wall -Wextra

GEA_SOURCES = \
	gea/lzge.c \
	gea/delzge.c \
	gea/huffman.c \
	gea/dehuffman.c \
	gea/match.c

.PHONY: all clean

all: gea-extract

gea-extract: gea-extract.c $(GEA_SOURCES)
	$(CC) $(CFLAGS) -o $@ $^

clean:
	$(RM) gea-extract
