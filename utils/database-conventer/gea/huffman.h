/******************************************************************************
*
* Copyright (C) 2009, The Gentee Group. All rights reserved.
* This file is part of the Gentee open source project - http://www.gentee.com.
*
* THIS FILE IS PROVIDED UNDER THE TERMS OF THE GENTEE LICENSE ("AGREEMENT").
* ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE CONSTITUTES RECIPIENTS
* ACCEPTANCE OF THE AGREEMENT.
*
* Author: Alexey Krivonogov ( gentee )
*
******************************************************************************/

#ifndef _HUFFMAN_
#define _HUFFMAN_

   #include "gea.h"

   #ifdef __cplusplus
      extern "C" {
   #endif // __cplusplus

//--------------------------------------------------------------------------

struct hufleaf_tag;
typedef struct hufleaf_tag * pshufleaf;

// лист дерева для символа алфавита
typedef struct hufleaf_tag
{
//   word       code;      // значение литеры
   dword      freq;      // частота вхождения
   pshufleaf  up;        // указатель на верхний элемент
   pshufleaf  left;      // указатель на левый элемент
   pshufleaf  right;     // указатель на правый элемент
} shufleaf;

// Хафман
typedef struct
{
   dword      numcode;   // размер алфавита
   dword      allcode;   // общее количество узлов
   pshufleaf  root;      // верхний элемент дерева
   pshufleaf  tree;      // дерево алфавита

   pbyte      stack;     // Стэк вывода
   dword      min;       // Минимальная глубина элементов
   dword      max;       // Максимальная глубина элементов
//   dword      pretree;   // 1 если pretree хафмана
   pbyte      ptr;       // Указатель вывода
   dword      bit;       // Номер бита
   dword      fixed;     // Упаковывать дерево фиксированными кодами
                         // Иначе строим еще одно дерево длин
   pbyte      prevlen;   // Предыдущие длины

   pshufleaf* normalize; // Для huf_normalize
   pdword     freq;      // Для huf_detree
} shuf, * pshuf;

#define  PRET_MAXCODE    15  // Максимально кодируемая глубина
#define  PRET_ALPHABET   20  // Алфавит дерева упаковки
//#define  PRET_MAXZERO    47  // Максимальный повтор 0
#define  PRET_MAXZERO    87  // Максимальный повтор 0

#define  PRET_OFF1       4
#define  PRET_OFF2       8
#define  PRET_OFF3       24

#define  PRET_ZERO2      16  // Следом идет 2 bit для 0 4 - 7
//#define  PRET_ZERO3      16  // Следом идет 3 bit для 0 4 - 11
//#define  PRET_ZERO3      17  // Следом идет 3 bit для 0 8 - 15
#define  PRET_ZERO4      17  // Следом идет 4 bit для 0 8 - 23
//#define  PRET_ZERO5      18  // Следом идет 5 bit для 0 16 - 47
#define  PRET_ZERO6      18  // Следом идет 6 bit для 0 24 - 87
#define  PRET_BIG        19  // Следом идет bits для длины > PRET_MAXCODE


//--------------------------------------------------------------------------
/*  Формат записи дерева Хаффмана
[1]   3 b - сколько бит отводить на значения min, max - min + 1
            0 - не менять дерево
      [1] b - Минимальная глубина дерева
      [1] b - Диапазон глубин

  fixed
      numcode * [1] - глубины для всех символов

  not fixed


  20 * [1] b - длины pre-tree

  2 b -  Сдвиг значений длин. Добавляется к ненулевой длине.
          0 1 2 3

*/
//--------------------------------------------------------------------------
// Common fucntions
pshuf STDCALL huf_new( pshuf huf, dword alphabet );
void  STDCALL huf_destroy( pshuf huf );
void  STDCALL huf_normilize( pshuf huf );

// Compression functions
void  STDCALL    huf_build( pshuf huf );
void  STACKAPI  huf_outbits( pshuf huf, dword item );
dword STACKAPI  huf_bits( pshuf huf, dword item );
void  STACKAPI  huf_incfreq( pshuf huf, dword item );
void  STACKAPI  huf_packnum( pshuf huf, dword val, dword bits );

// Decompression functions
void  STDCALL    huf_detree( pshuf huf );
dword STACKAPI  huf_inbits( pshuf huf );
dword  STACKAPI huf_unpacknum( pshuf huf, dword bits );


//--------------------------------------------------------------------------

   #ifdef __cplusplus
      }
   #endif // __cplusplus

#endif // _HUFFMAN_
