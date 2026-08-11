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

#include "match.h"
#include "lzge.h"
//#include "K:\Gentee\Gentee Language\VM Lib\memory.h"

//--------------------------------------------------------------------------

dword STDCALL match_new( psmatch match, pbyte start, pbyte end, dword level )
{
   dword  i;
   dword  hsize[] = { 16, 16, 19 };
   dword  wsize[] = { 15, 16, 15 };

   match->hash2 = ( pdword )mem_allocz( ( 1 << 16 ) * sizeof( dword ));

   wsize[2] = min( 21, lzge_bits( end - start ));

   for ( i = 0; i < 3; i++ )
   {
      if ( i == 1 && wsize[ 1 ] > wsize[2] ) break;
      if ( i == 2 && wsize[ 1 ] == wsize[2] ) break;

      match->hash[ i ] = ( pdword )mem_allocz( ( 1 << hsize[ i ] ) * sizeof( dword ));
      match->hsize[ i ] = 1 << hsize[i];
      match->next[ i ] = ( pdword )mem_alloc( ( 1 << wsize[i] ) * sizeof( dword ));
      match->size[ i ] = 1 << wsize[i];
      match->top[ i ] = 0;
      match->limit[i] = ( 1 << min( 14, level + 3 + 21 - wsize[2] ));
   }
   match->count = i;
//   printf("Count=%i size=%i\n", match->count, 1<< wsize[2] );
   match->start = start;
   match->end = end;

   return ( 1 << wsize[2] ) - 1;
}

//--------------------------------------------------------------------------

void STDCALL match_destroy( psmatch match )
{
   dword  i;

   mem_free( match->hash2 );
   for ( i = 0; i < match->count; i++ )
   {
      mem_free( match->hash[i] );
      mem_free( match->next[i] );
   }
}

//--------------------------------------------------------------------------

dword STACKAPI match_find( psmatch match, pbyte input, pdword retoff )
// Вызов должен быть со второго символа
{
   dword  off = input - match->start;
   dword  hash;
   dword  len = 1;
   dword  lastoff; // Последнее найденное смещение
   dword  i, limit;
   dword  cur, offset;
   uint   k;//, j;

   if ( !off || input + 2 > match->end ) return len;

   *retoff = 0;
// Ищем по длине 2
   if (( cur = match->hash2[ *( pword )input ] ))
   {
      offset = off - cur + 1;
      if ( offset < 256 + MIN_OFFSET )
      {
         len = 2;
         while ( input[ len ] == *( input - offset + len ) &&
            input + len < match->end )
            len++;
         *retoff = offset;
      }
   }
   hash = ((( dword )input[0] ) << 3 ) ^ input[ 1 ];
// Ищем по остальным длинам
   for ( i = 0; i < match->count; i++ )
   {
//      if ( input + 3 + i > match->end ) break;
      if ( input + len == match->end ||
           input + 3 + i > match->end )
         break;

      limit = 0;
      hash = ( hash << 3 ) ^ input[ 2 + i ];
      hash &= match->hsize[i] - 1;
      lastoff = 0;
      cur = match->hash[ i ][ hash ];

      while ( cur-- )
      {
         // Находим смещение
         offset = match->top[i] + ( cur < match->top[i] ? 0 : match->size[i] ) -
                                  cur + 2 + i;
         if ( offset <= lastoff || offset >= match->size[i] ) break;
         lastoff = offset;
         if ( offset <= *retoff ) goto next;

         if ( len > 2 + i )  // Уже есть найденные вхождения
         {
            for ( k = len; k >= 0; k-- )
            {
               if ( input[ k ] != *( input - offset + k ))
                  goto next;
            }
            len++;
         }
         else
         {
            for ( k = 0; k < 3 + i; k++ )
            {
               if ( input[ k ] != *( input - offset + k ))
                  goto next;
            }
            len = 3 + i;
         }
         // Теперь смотрим вправо
         while ( input[ len ] == *( input - offset + len ) && input + len < match->end )
            len++;
         *retoff = offset;
next:
         cur = match->next[i][ cur ];
         if ( ++limit > match->limit[ i ] || input + len == match->end )
            break;
      }
   }
   if ( len >= match->size[ match->count - 1 ] - 1 )
      len = match->size[ match->count - 1 ] - 1;
//   if ( input + len > match->end )
//      printf("Error off=%i len=%i\n ", *retoff, len );
// Обновляем хэш-таблицы
   k = len;
   while ( k )
   {
      match_update( match, input );

/*      match->hash2[ *( pword )( input - 2 ) ] = input - match->start - 1;

// Ищем по остальным длинам
      for ( i = 0; i < match->count; i++ )
      {
         if ( input - match->start < i + 2 ) break;
         hash = *( input - 2 - i );
         for ( j = 1 + i; j >= 0; j-- )
            hash = ( hash << 3 ) ^ *( input - j );
         hash &= match->hsize[i] - 1;

         match->next[i][ match->top[i]] = match->hash[ i ][ hash ];
         match->hash[i][ hash ] = match->top[i] + 1;
         match->top[i]++;
         if ( match->top[i] == match->size[i] )
            match->top[i] = 0;
      }*/
      k--;
      input++;
   }
   return len;
}

//--------------------------------------------------------------------------

dword  STACKAPI match_update( psmatch match, pbyte input )
{
   dword  i;
   int    j;
   dword  hash;

//   if ( input == match->start ) return 1;

   match->hash2[ *( pword )( input - 2 ) ] = input - match->start - 1;

// Ищем по остальным длинам
   for ( i = 0; i < match->count; i++ )
   {
      if ( input - match->start < (int)( i + 2 )) break;
      hash = *( input - 2 - i );
      for ( j = 1 + i; j >= 0; j-- )
         hash = ( hash << 3 ) ^ *( input - j );
      hash &= match->hsize[i] - 1;

      match->next[i][ match->top[i]] = match->hash[ i ][ hash ];
      match->hash[i][ hash ] = match->top[i] + 1;
      match->top[i]++;

      if ( match->top[i] == match->size[i] )
         match->top[i] = 0;
   }
   return 1;
}

//--------------------------------------------------------------------------
