 <template>
  <div class="container">
    <div v-if="selectedZipcode===null">
      <h1 class="page-title">台灣 3+3 郵遞區號查詢</h1>
      <simple-typeahead
        class="search-input"
        :items="Object.keys(addressList)"
        placeholder="輸入關鍵字來查詢…"
        @selectItem="selectItem"
        v-model="addressInput"
      />
      <div class="tips">
        <i class="bx bxs-info-circle"></i>
        <span v-if="addressInput==''">你可以透過像是：「中山北路」、「信義區松山路」、「台北 忠孝東路」等關鍵字來查詢郵遞區號。</span>
        <span v-else>點選下列郵遞區號即可查詢詳細資訊或將地址轉換為英文。</span>
      </div>
      <div class="result-items">
        <div class="result-item-header">
          <div class="result-item-zipcode">郵遞區號</div>
          <div class="result-item-scope">範圍</div>
          <div class="result-item-icon"></div>
        </div>
        <div class="result-item" v-if="!resultList.length">查無結果</div>
        <div
          class="result-item"
          v-for="(item,i) of resultList"
          :key="i"
          @click="selectedZipcode = item"
        >
          <div class="result-item-zipcode">{{ item.zipcode }}</div>
          <div class="result-item-scope">
            <span v-if="item.department">
              {{ item.department }}
              <br />
            </span>
            {{ item.scope }}
          </div>
          <div class="result-item-icon">
            <i class="bx bx-right-arrow-alt"></i>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <button class="back-btn" @click="selectedZipcode=null">
        <i class="bx bx-arrow-back"></i> 返回
      </button>
      <h2 class="page-subtitle">{{selectedZipcode.zipcode}} {{addressInput}}</h2>
      <section class="detail-section">
        <div class="bold">後續地址</div>
        <input
          type="text"
          id="addressForm"
          v-model="addressForm"
          autocomplete="off"
          placeholder="如：31巷12號之5 5樓、31號404室⋯等"
        />
        <div class="tips error" v-for="warn of address.warns" :key="warn">
          <i class="bx bxs-error"></i>
          {{ warn }}
        </div>
        <div
          class="tips"
          v-if="!Object.values(address.form).some(x=>x)"
          style="margin-bottom: calc(.5em + 13px)"
        >
          <i class="bx bxs-info-circle"></i> 該功能可能會有錯誤，使用前請務必確認中文地址是否正確。
        </div>
        <div class="matched-address" v-if="Object.values(address.form).some(x=>x)">
          <div class="matched-address-item" v-if="address.form.ln">{{address.form.ln}}巷</div>
          <div class="matched-address-item" v-if="address.form.aly">{{address.form.aly}}弄</div>
          <div
            class="matched-address-item"
            v-if="address.form.no"
          >{{address.form.no}}號{{ address.form.noDash && `之${ address.form.noDash}` }}</div>
          <div
            class="matched-address-item"
            v-if="address.form.floor"
          >{{address.form.floor}}樓{{ address.form.floorDash && `之${ address.form.floorDash}` }}</div>
          <div class="matched-address-item" v-if="address.form.room">{{address.form.room}}室</div>
        </div>
      </section>
      <section class="detail-section">
        <div class="bold">郵遞區號</div>
        {{ selectedZipcode.zipcode }}
      </section>
      <section class="detail-section">
        <div class="bold">範圍</div>
        {{ selectedZipcode.scope }}
      </section>
      <section class="detail-section" v-if="selectedZipcode.department">
        <div class="bold">大宗戶</div>
        {{ selectedZipcode.department }}
      </section>
      <section class="detail-section">
        <div class="bold">中文地址</div>
        {{ address.zh }}
      </section>
      <section class="detail-section">
        <div class="bold">英文地址</div>
        {{ address.en }}
        <div class="tips">
          <i class="bx bxs-info-circle"></i> 可填寫上方後續地址欄位，取得完整英文地址。
        </div>
      </section>
      <!-- <pre>{{ address.form }}</pre> -->
    </div>
    <div class="footer">
      Developed by
      <a href="https://gnehs.net" target="_blank">gnehs</a> | Made with
      <a href="https://pancake.gnehs.net" target="_blank">🥞</a> in
      Taiwan |
      <a href="https://github.com/gnehs/TaiwanZipcode">GitHub</a>
      <br />資料擷取自郵局資料庫，資料僅供參考，可能會有所遺漏、錯誤或未即時更新，正確資料請以郵局公佈為主。
    </div>
  </div>
</template>
<style lang="sass">
*
  box-sizing: border-box
\:root
  // basic
  --border-radius: 8px
  // color
  --text-color: #333
  --border-color: rgba(0,0,0,.2)
  --border-focus-color: rgba(0,0,0,.4)
  --background-color: #fff
  --secondary-background-color: #f2f2f2
  --tertiary-background-color: #e6e6e6

  ::-webkit-scrollbar-track
    background-color: var(--secondary-background-color)
  ::-webkit-scrollbar
    width: 7px
    height: 7px
    background-color: var(--secondary-background-color)
  ::-webkit-scrollbar-thumb
    background-color: var(--text-color)
@media (prefers-color-scheme: dark)
  \:root
    --text-color: #fff
    --border-color: rgba(255,255,255,.2)
    --border-focus-color: rgba(255,255,255,.4)
    --background-color: #222
    --secondary-background-color: #333
    --tertiary-background-color: #444
body
  background-color: var(--secondary-background-color)
  color: var(--text-color)
  font-family: 'PingFang TC', 'Noto Sans TC', sans-serif
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
.page-subtitle
  font-size: 24px
  .page-title + &
    margin-top: -16px
  @media (max-width: 768px)
    font-size: 18px
.tips
  margin: .5em 0
  display: flex
  align-items: center
  align-content: center
  gap: .25em
  font-size: 14px
  opacity: .75
  &.error
    color: red
.detail-section
  margin: 1em 0
.matched-address
  display: flex
  align-items: center
  margin: .5em 0
  .matched-address-item
    margin-right: .5em
    font-size: 12px
    background-color: var(--tertiary-background-color)
    padding: .25em .5em
    border-radius: var(--border-radius)
    @media (max-width: 768px)
      font-size: 14px
    &:last-child
      margin-right: 0
.result-items
  margin-top: 16px
  background-color: var(--background-color)
  border: 1px solid var(--border-color)
  font-size: 16px
  border-radius: var(--border-radius)
  @media (max-width: 768px)
    font-size: 14px
  .result-item-header
    font-weight: bold
    background-color: var(--tertiary-background-color)
  .result-item,.result-item-header
    padding: .5em
    display: grid
    grid-template-columns: 6rem 1fr 1em
    align-items: center
    &:first-child
      border-radius: var(--border-radius) var(--border-radius) 0 0
    &:last-child
      border-radius: 0 0 var(--border-radius) var(--border-radius)
    &:nth-child(odd)
      background-color: var(--secondary-background-color)
    &:not(:first-child)
      border-top: 1px solid var(--border-color)
    .result-item-zipcode
      font-weight: 700
    .result-item-icon
      font-size: 24px
      display: flex
      justify-content: center
      opacity: .25
      transform: translateX(-2px)
      transition: all .2s ease
  .result-item
    cursor: pointer
    &:hover
      background-color: var(--tertiary-background-color)
      .result-item-icon
        transform: translateY(0)
        opacity: 1
.back-btn
  all: unset
  cursor: pointer
  display: inline-block
  padding: .25em .75em
  border-radius: var(--border-radius)
  border: 1px solid transparent
  background-color: var(--tertiary-background-color)
  &:hover
    background-color: color-mix(in srgb, var(--tertiary-background-color), var(--text-color) 10%)
  &:active
    background-color: color-mix(in srgb, var(--tertiary-background-color), var(--text-color) 20%)
.bold
  font-weight: bold
#addressForm
  line-height: 1
  box-shadow: 0 8px 8px transparent
  background-color: var(--background-color)
  border: 1px solid var(--border-color)
  color: var(--text-color)
  border-radius: var(--border-radius)
  width: 100%
  font-size: 18px
  padding: .75em
  transition: all .2s ease
  &:focus
    outline: none
    border: 1px solid var(--border-focus-color)
    box-shadow: 0 8px 8px rgba(0,0,0,.1)
  @media (max-width: 768px)
    font-size: 18px
    padding: .5em
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
  &>.search-input
    margin-bottom: 0
    line-height: 1
    box-shadow: 0 8px 8px transparent
    background-color: var(--background-color)
    border: 1px solid var(--border-color)
    color: var(--text-color)
    border-radius: var(--border-radius)
    width: 100%
    font-size: 24px
    padding: .75em
    transition: all .2s ease
    &:focus
      outline: none
      border: 1px solid var(--border-focus-color)
      box-shadow: 0 8px 8px rgba(0,0,0,.1)
    @media (max-width: 768px)
      font-size: 18px
      padding: .5em
  &:has(.simple-typeahead-list)>.search-input
    border-radius: var(--border-radius) var(--border-radius) 0 0
  .simple-typeahead-list
    position: absolute
    width: 100%
    border: none
    max-height: 400px
    overflow-y: auto
    border-bottom: 1px solid var(--border-color)
    z-index: 9
    box-shadow: 0 8px 8px rgba(0,0,0,.1)
    border-radius: 0 0 var(--border-radius) var(--border-radius)
    @media (max-width: 768px)
      max-height: 300px
    .simple-typeahead-list-header
      background-color: var(--background-color)
      padding: .5em
      border-bottom: 1px solid var(--border-color)
      border-left: 1px solid var(--border-color)
      border-right: 1px solid var(--border-color)

    .simple-typeahead-list-footer
      background-color: var(--background-color)
      padding: .5em
      border-left: 1px solid var(--border-color)
      border-right: 1px solid var(--border-color)

    .simple-typeahead-list-item
      cursor: pointer
      background-color: var(--background-color)
      padding: .5em
      border-bottom: 1px solid var(--border-color)
      border-left: 1px solid var(--border-color)
      border-right: 1px solid var(--border-color)
      &:last-child
        border-bottom: none
        border-radius: 0 0 var(--border-radius) var(--border-radius)
      &.simple-typeahead-list-item-active
        background-color: var(--tertiary-background-color)
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
      addressList: {},
      zhEnAddressList: {},
      addressInput: "",
      selectedZipcode: null,
      addressForm: ""
    }
  },
  computed: {
    resultList() {
      let key = Object.keys(this.addressList)
        .filter(x => this.addressInput == x)
        .sort((a, b) => b.length - a.length)
      if (!key.length) return []
      return this.addressList[key[0]] || [];
    },
    address() {
      let warns = []
      let form = {
        ln: null,
        aly: null,
        no: null,
        noDash: null,
        floor: null,
        floorDash: null,
        room: null,
      }
      if (!this.selectedZipcode) return {
        en: "",
        zh: "",
        form,
        warns
      };
      let addressForm = this.addressForm;
      // error detect
      if (addressForm.match(/一|二|三|四|五|六|七|八|九|十/)) {
        warns.push("請不要輸入中文數字")
      }
      if (addressForm.match(/衖/)) {
        warns.push("不支援「衖」三分支編址")
      }
      if (addressForm.match(/(.+?)巷/) && !addressForm.match(/(\d+)巷/)) {
        warns.push("不支援在此介面輸入中文巷弄名稱")
      }

      let formMatch = {
        ln: /(\d+)巷/,
        aly: /(\d+)弄/,
        no: /(\d+)號|(\d+)-\d+號/,
        noDash: /號之(\d+)|\d+-(\d+)號/,
        floor: /(\d+)樓/,
        floorDash: /樓之(\d+)/,
        room: /(\w+)室|(\d+)室| (.+?)室/,
      }
      for (let key in formMatch) {
        let match = addressForm.match(formMatch[key])
        if (match) form[key] = match.slice(1).filter(x => x).join("")
      }
      let zh = this.addressInput
      let en = this.zhEnAddressList[this.addressInput].split(", ").reverse()
      if (form.ln) {
        zh += form.ln + "巷"
        en.push(form.ln + " Ln")
      }
      if (form.aly) {
        zh += form.aly + "弄"
        en.push(form.aly + " Aly")
      }
      if (form.no) {
        zh += form.no + "號"
        if (form.noDash) {
          zh += "之" + form.noDash + " "
          en.push(" No. " + form.no + "-" + form.noDash)
        } else {
          en.push(" No." + form.no)
        }
      }
      if (form.floor) {
        zh += form.floor + "樓"
        if (form.floorDash) {
          zh += "之" + form.floorDash + " "
          en.push(form.floor + "F-" + form.floorDash)
        } else {
          en.push(form.floor + "F")
        }
      }
      if (form.room) {
        zh += form.room + "室"
        en.push(form.room + " Room")
      }
      en = en.reverse().join(", ")
      return {
        zh,
        en,
        form,
        warns
      }
    },
  },
  created() {
    this.generateAddressList();
    let hashString = decodeURIComponent(window.location.hash.replace("#", ""));
    if (hashString) {
      let [zipcode, address, addressForm] = hashString.split("_");
      zipcode = parseInt(zipcode);
      this.addressInput = address;
      this.addressForm = addressForm;

      for (let [_, items] of Object.entries(this.addressList)) {
        for (let item of items) {
          if (item.zipcode === zipcode) {
            this.selectedZipcode = item;
            break;
          }
        }
      }
    }
  },
  watch: {
    selectedZipcode() {
      this.updateHash()
    },
    addressForm() {
      this.updateHash()
    }
  },
  methods: {
    generateAddressList() {
      let result = {};
      let zhEnResult = {};
      for (let city of Object.keys(zipcodeData)) {
        for (let area of Object.keys(zipcodeData[city].areas)) {
          for (let road of Object.keys(zipcodeData[city].areas[area].roads)) {
            result[`${city}${area}${road}`] = zipcodeData[city].areas[area].roads[road].scopes
            zhEnResult[`${city}${area}${road}`] = [
              "Taiwan (R.O.C.)",
              zipcodeData[city].en,
              zipcodeData[city].areas[area].en,
              zipcodeData[city].areas[area].roads[road].en
            ].reverse().join(", ")
          }
        }
      }
      this.addressList = result;
      this.zhEnAddressList = zhEnResult;
    },
    selectItem(item) {
      this.addressInput = item;
    },
    updateHash() {
      let selectedZipcode = this.selectedZipcode?.zipcode
      let addressInput = this.addressInput
      let addressForm = this.addressForm
      if (!selectedZipcode) {
        window.location.hash = "";
        return;
      }
      window.location.hash = selectedZipcode + "_" + addressInput + '_' + addressForm;
    }
  }

}
</script>