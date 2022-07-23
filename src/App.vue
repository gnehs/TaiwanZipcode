<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
</script>

<template>
  <div class="container">
    <h1>台灣 3+3 郵遞區號查詢</h1>
    <vue3-simple-typeahead
      class="search-input"
      :items="Object.keys(addressList)"
      placeholder="輸入全部或部分地址來查詢"
      @selectItem="selectItem"
      v-model="addressInput" />
    <div class="result-items">
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
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1)
  width: 95%
  max-width: 768px
  margin: 10px auto
  padding: 16px
  border-radius: 8px
  background-color: #fff
.search-input
  border: none
  border-bottom: 1px solid #ccc
  width: 100%
  font-size: 24px
  &:focus
    outline: none
    border-bottom: 1px solid #000
.result-items
  margin-top: 16px
  gap: 8px
  .result-item
    padding: 8px
    display: grid
    grid-template-columns: 4em 1fr
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