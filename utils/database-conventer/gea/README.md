# Gentee LZGE decoder

此目錄包含 `gea-extract` 使用的 Gentee LZGE 開放原始碼解碼器。原始檔來自
[Gentee GEA source](https://www.gentee.com/source/src/projects/gea/index.htm)，依
[Gentee Open Source License (MIT License)](./LICENSE) 使用。

為了在現代 C 編譯器及 Linux/macOS 建置，專案只做了兩項不改變演算法的可攜性調整：

- 非 Windows 平台補上空的 `__cdecl` 定義。
- 將 `match.c` 條件式中的賦值加上括號，以通過 `-Werror`。

GEA v2 的容器解析、CRC/DBF 驗證及只抽取 `DBF/rall1.dbf` 的邏輯位於上一層的
`gea-extract.c`。
