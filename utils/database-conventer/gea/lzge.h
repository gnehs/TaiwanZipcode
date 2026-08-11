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

#ifndef _LZGE_
#define _LZGE_

   #include "huffman.h"
   #include "match.h"

   #ifdef __cplusplus
      extern "C" {
   #endif // __cplusplus

//--------------------------------------------------------------------------
// Размер элементов закодированных по Хаффману, после которых идет
// сброс дерева
#define  HUF_BLOCK      10000      // Размер блока хаффмана по умолчанию.
// Алфавит главного дерева Хаффмана
#define  LZGE_ALPHABET  256
// Минимальная длина совпадения
#define  MATCH_LEN      2
// Минимальное смещение
#define  MIN_OFFSET     2
#define  ALL_LEN        19     // Всего разбиение на длины
#define  SLOT_LEN       18     // Разбиение для слотов

typedef struct
{
   // Определяемые общие
   dword  hufblock;    // Размер блока для построения дерева Хафмана
   // Определяемые для сжатия
   dword  level;       // Скорость сжатия от 1 до 10
   // Вычисляемые параметры
   dword  numoff;      // Количество элементов смещений из rng
   dword  maxbit;      // Количество bit на размер окна
   dword  solidoff;    // Смещение solid данных
   dword  mft[3];      // Последние базы смещений
   dword  userfunc;    // Пользовательская функция
   dword  pgeaparam;  // Указатель на geaparam
} slzge, * pslzge;

extern dword   rngbits[];
extern dword   rngmax[ 51 ];
extern dword   rngmin[ 51 ];

extern dword   lenmax[ 20 ];
extern dword   lenmin[ 20 ];
extern dword   lenbits[];


//--------------------------------------------------------------------------
// Common LZGE
dword  STACKAPI lzge_bits( dword val );

dword  STDCALL lzge_encode( pbyte in, dword size, pbyte out, pslzge lzge );
dword  STDCALL lzge_decode( pbyte in, pbyte out, dword size, pslzge lzge );
void   STDCALL lzge_ranges( pslzge lzge, dword maxoff );

//--------------------------------------------------------------------------

   #ifdef __cplusplus
      }
   #endif // __cplusplus

#endif // _LZGE_
