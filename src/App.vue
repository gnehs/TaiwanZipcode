 <template>
  <div class="container">
    <h1 class="page-title">台灣 3+3 郵遞區號查詢</h1>
    <simple-typeahead
      class="search-input"
      :items="Object.keys(addressList)"
      placeholder="輸入路名、鄉鎮市區或完整地址來查詢…"
      @selectItem="selectItem"
      v-model="addressInput" />
    <div class="search-tips">
      ℹ️ 你可以透過關鍵字來查詢郵遞區號，像是：「中山北路」、「信義區松山路」、「台北 忠孝東路」，或是透過完整地址查詢。
    </div>
    <div class="result-items">
      <div class="result-item-header">
        <div class="result-item-zipcode">
          郵遞區號
        </div>
        <div class="result-item-scope">
          範圍
        </div>
      </div>
      <div class="result-item" v-if="!resultList.length">查無結果</div>
      <div class="result-item" v-for="item of resultList">
        <div class="result-item-zipcode">
          {{ item.zipcode }}
        </div>
        <div class="result-item-scope">
          {{ item.scope }}
        </div>
      </div>
    </div>
    <div class="footer">
      台灣 3+3 郵遞區號查詢 | Made with 🥞 by <a href="https://gnehs.net">gnehs</a> | <a href="https://github.com/gnehs/TaiwanZipcode">GitHub</a>
      <br /> 資料擷取自郵局資料庫，資料僅供參考，可能會有所遺漏、錯誤或未即時更新，正確資料請以郵局公佈為主。
    </div>
  </div>
</template>
<style lang="sass">
*
  box-sizing: border-box
\:root
  --text-color: #333
  --border-color: rgba(0,0,0,.2)
  --border-focus-color: rgba(0,0,0,.4)
  --background-color: #fff
  --secondary-background-color: #f2f2f2
@media (prefers-color-scheme: dark)
  \:root
    --text-color: #fff
    --border-color: rgba(255,255,255,.2)
    --border-focus-color: rgba(255,255,255,.4)
    --background-color: #000
    --secondary-background-color: #222
body
  background-color: var(--secondary-background-color)
  color: var(--text-color)
  font-family: 'Noto Sans TC', sans-serif
  line-height: 1.5
.container
  width: 95%
  max-width: 768px
  margin: auto
  margin-top: 128px
  @media (max-width: 768px)
    margin-top: 16px
.page-title
  text-align: center
  font-size: 36px
  @media (max-width: 768px)
    font-size: 24px
.search-input
  border: none
  background-color: var(--background-color)
  border: 1px solid var(--border-color)
  color: var(--text-color)
  border-radius: 0
  width: 100%
  font-size: 24px
  padding: .75em
  &:focus
    outline: none
    border: 1px solid var(--border-focus-color)
  @media (max-width: 768px)
    font-size: 18px
    padding: .5em
.search-tips
  margin: .25em 0 1em 0
  font-size: 14px
  opacity: .75
.result-items
  margin-top: 16px
  background-color: var(--background-color)
  border: 1px solid var(--border-color)
  font-size: 16px
  @media (max-width: 768px)
    font-size: 14px
  .result-item-header
    font-weight: bold
    background-color: var(--secondary-background-color)
  .result-item,.result-item-header
    padding: .5em
    display: grid
    grid-template-columns: 6rem 1fr
    &:not(:first-child)
      border-top: 1px solid var(--border-color)
    .result-item-zipcode
      font-weight: 700
.footer,.statement
  text-align: center
  font-size: 12px
  opacity: .5
  margin: 32px 0
  a
    color: var(--text-color)
.simple-typeahead
  position: relative
  width: 100%
  &>input
    margin-bottom: 0
  .simple-typeahead-list
    position: absolute
    width: 100%
    border: none
    max-height: 400px
    overflow-y: auto
    border-bottom: 1px solid var(--border-color)
    z-index: 9
    @media (max-width: 768px)
      max-height: 300px
    .simple-typeahead-list-header
      background-color: var(--background-color)
      padding: 0.6rem 1rem
      border-bottom: 1px solid var(--border-color)
      border-left: 1px solid var(--border-color)
      border-right: 1px solid var(--border-color)

    .simple-typeahead-list-footer
      background-color: var(--background-color)
      padding: 0.6rem 1rem
      border-left: 1px solid var(--border-color)
      border-right: 1px solid var(--border-color)

    .simple-typeahead-list-item
      cursor: pointer
      background-color: var(--background-color)
      padding: 0.6rem 1rem
      border-bottom: 1px solid var(--border-color)
      border-left: 1px solid var(--border-color)
      border-right: 1px solid var(--border-color)
      &:last-child
        border-bottom: none
      &.simple-typeahead-list-item-active
        background-color: var(--secondary-background-color)

</style>
<script>
import zipcodeData from "./assets/zipcode.json";
import simpleTypeahead from "./components/vue3-simple-typeahead.vue";
export default {
  components: {
    simpleTypeahead
  },
  data() {
    return {
      zipcodeData,
      addressList: {},
      addressInput: "",
    }
  },
  computed: {
    resultList() {
      let key = Object.keys(this.addressList).filter(x => this.addressInput.includes(x))
      if (!key.length) return []
      return this.addressList[key] || [];
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