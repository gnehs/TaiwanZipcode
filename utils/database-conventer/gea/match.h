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

#ifndef _MATCH_
#define _MATCH_

   #include "gea.h"

   #ifdef __cplusplus
      extern "C" {
   #endif // __cplusplus

//--------------------------------------------------------------------------

typedef struct
{
   pdword  hash2;     // Смещения последних совпадений длины 2

   pdword  hash[3];   // Хэш-цепочка совпадений длины
   pdword  next[3];   // Цепочки вхождений от первого к последнему
   dword   top[3];    // Текущая вершина 0 == match->next
   dword   hsize[3];  // Размер хэш-таблицы
   dword   size[3];   // Размер окна
   dword   limit[3];  // Глубина поиска в хэш-цепочке
   dword   count;     // Количество хэш-таблиц
   pbyte   start;     // Начало
   pbyte   end;       // Конец
} smatch, * psmatch;

//--------------------------------------------------------------------------

dword STDCALL   match_new( psmatch match, pbyte start, pbyte end, dword level );
void  STDCALL   match_destroy( psmatch match );
dword STACKAPI match_find( psmatch match, pbyte input, pdword retoff );
dword STACKAPI match_update( psmatch match, pbyte input );

//--------------------------------------------------------------------------

   #ifdef __cplusplus
      }
   #endif // __cplusplus

#endif // _MATCH_
