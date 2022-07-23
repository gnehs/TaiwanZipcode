<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
</script>

<template>
  <div class="container">
    <h1 class="page-title">台灣 3+3 郵遞區號查詢</h1>
    <vue3-simple-typeahead
      class="search-input"
      :items="Object.keys(addressList)"
      placeholder="輸入地址、路名或是鄉鎮市區來查詢"
      @selectItem="selectItem"
      v-model="addressInput" />
    <div class="result-items" v-if="resultList.length">
      <div class="result-item-header">
        <div class="result-item-zipcode">
          郵遞區號
        </div>
        <div class="result-item-scope">
          範圍
        </div>
      </div>
      <div class="result-item" v-for="item of resultList">
        <div class="result-item-zipcode">
          {{ item.zipcode }}
        </div>
        <div class="result-item-scope">
          {{ item.scope }}
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="sass">
.container
  width: 95%
  max-width: 768px
  margin: auto
  margin-top: 128px
.page-title
  text-align: center
  font-size: 36px
  margin: 1em 0
.search-input
  border: none
  background-color: #fff
  border: 1px solid #ccc
  padding: 16px
  width: 100%
  font-size: 24px
  &:focus
    outline: none
    border: 1px solid #000
.result-items
  margin-top: 16px
  background-color: #fff
  border: 1px solid #ccc
  .result-item-header
    font-weight: bold
    background-color: rgba(0,0,0,.05)
  .result-item,.result-item-header
    padding: 8px
    display: grid
    grid-template-columns: 6rem 1fr
    &:not(:first-child)
      border-top: 1px solid #ccc
    .result-item-zipcode
      font-weight: 700

</style>
<script>
import zipcodeData from "./assets/zipcode.json";
export default {
  data() {
    return {
      zipcodeData,
      addressList: {},
      addressInput: null,
    }
  },
  computed: {
    resultList() {
      return this.addressList[this.addressInput] || [];
    }
  },
  mounted() {
    this.generateAddressList();
  },
  methods: {
    generateAddressList() {
      let result = {};
      for (let city of Object.keys(this.zipcodeData)) {
        for (let area of Object.keys(this.zipcodeData[city])) {
          for (let road of Object.keys(this.zipcodeData[city][area])) {
            result[`${city}${area}${road}`] = this.zipcodeData[city][area][road];
          }
        }
      }
      this.addressList = result;
    },
    selectItem(item) {
      this.addressInput = item;
    },
  }

}
</script>