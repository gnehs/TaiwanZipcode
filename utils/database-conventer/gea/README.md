# Gentee LZGE decoder

此目錄包含 `gea-extract` 使用的 Gentee LZGE 開放原始碼解碼器。原始檔來自
[Gentee GEA source](https://www.gentee.com/source/src/projects/gea/index.htm)，依
[Gentee Open Source License (MIT License)](./LICENSE) 使用。

為了在現代 C 編譯器及 Linux/macOS 建置，專案只做了以下不改變演算法的調整：

- 非 Windows 平台補上空的 `__cdecl` 定義。
- 將 `match.c` 條件式中的賦值加上括號，以通過 `-Werror`。
- `lzge_decode` 回傳的已讀位元組數在資料剛好結束於位元組邊界時會多算 1，改為只在最後一個位元組有被讀取時才計入。

GEA v2 的容器解析、CRC/DBF 驗證及只抽取 `DBF/rall1.dbf` 的邏輯位於上一層的
`gea-extract.c`。
