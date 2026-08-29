<template>
  <div class="container">
    <div v-if="!isDetailOpen">
      <h1 class="page-title">台灣 3+3 郵遞區號查詢</h1>
      <simple-typeahead
        ref="searchInput"
        class="search-input"
        :items="Object.keys(addressList)"
        placeholder="輸入關鍵字來查詢…"
        @selectItem="openDetail"
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
        <button
          type="button"
          class="result-item"
          v-for="(item,i) of resultList"
          :key="`${item.zipcode}-${item.scope}-${i}`"
          @click="openDetail(addressInput, item)"
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
        </button>
      </div>
    </div>
    <div v-else>
      <button class="back-btn" @click="returnToSearch">
        <i class="bx bx-arrow-back"></i> 返回
      </button>
      <h2 class="page-subtitle">
        <span v-if="displayedZipcode">{{ displayedZipcode }} </span>{{ addressInput }}
      </h2>
      <section class="detail-section">
        <label class="bold" for="addressForm">後續地址</label>
        <input
          ref="addressFormInput"
          type="text"
          id="addressForm"
          v-model="addressForm"
          autocomplete="off"
          placeholder="如：31巷12號之5 5樓、31號404室⋯等"
        />
        <div class="tips" v-if="!resolvedScope && (scopeResolution.status === 'empty' || scopeResolution.status === 'incomplete')">
          <i class="bx bxs-info-circle"></i>
          請繼續輸入完整的巷、弄、門牌、附號或樓層，系統會自動判斷郵遞區號。
        </div>
        <div class="tips error" v-else-if="scopeResolution.status === 'unmatched'">
          <i class="bx bxs-error"></i>
          找不到符合此後續地址的郵遞區號範圍，請確認門牌是否正確。
        </div>
        <div class="tips error" v-if="!resolvedScope && scopeResolution.status === 'ambiguous'">
          <i class="bx bxs-error"></i>
          此地址仍對應多個郵遞區號，請補上附號或樓層等完整資訊。
        </div>
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
          >{{ address.form.basement ? "地下" : "" }}{{address.form.floor}}樓{{ address.form.floorDash && `之${ address.form.floorDash}` }}</div>
          <div class="matched-address-item" v-if="address.form.room">{{address.form.room}}室</div>
        </div>
      </section>
      <section class="detail-section zipcode-section">
        <div class="zipcode-label-row">
          <div class="bold">郵遞區號</div>
          <div
            class="rules-disclosure"
            @mouseenter="showRulesInfoOnHover"
            @mouseleave="hideRulesInfoOnHover"
          >
            <button
              type="button"
              class="rules-info-button"
              aria-label="顯示此道路的所有郵遞區號規則"
              aria-controls="allZipcodeRules"
              :aria-expanded="isRulesInfoVisible"
              @click="toggleRulesInfo"
              @keydown.esc.stop="closeRulesInfo"
            >
              <i class="bx bxs-info-circle" aria-hidden="true"></i>
            </button>
            <div
              v-show="isRulesInfoVisible"
              id="allZipcodeRules"
              class="rules-popover"
              role="region"
              aria-labelledby="allZipcodeRulesTitle"
            >
              <div id="allZipcodeRulesTitle" class="rules-popover-title">
                此道路的所有郵遞區號規則
              </div>
              <ul class="rules-list">
                <li
                  v-for="(rule, index) of currentRoadScopes"
                  :key="`${rule.zipcode}-${rule.scope}-${index}`"
                  class="rules-list-item"
                  :class="{ 'is-active': rule === resolvedScope }"
                >
                  <span class="rules-list-zipcode">{{ displayRuleZipcode(rule.zipcode) }}</span>
                  <span>
                    <span v-if="rule.department" class="rules-list-department">
                      {{ rule.department }}
                    </span>
                    {{ formatScopeRule(rule.scope) }}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="zipcode-value">
          {{ displayedZipcode || "待輸入完整門牌後自動判斷" }}
        </div>
        <small class="matched-rule-caption" v-if="!hasAddressForm">
          {{ baseZipcodePrefixes.length === 1
            ? "尚未輸入後續地址，後三碼暫不顯示"
            : "此道路包含不同前三碼，請輸入後續地址後判斷" }}
        </small>
        <small class="matched-rule-caption" v-else-if="resolvedScope">
          匹配規則：{{ formatScopeRule(resolvedScope.scope) }}<span v-if="matchedRuleBasis">（以 {{ matchedRuleBasis }}判斷）</span>
        </small>
      </section>
      <section class="detail-section" v-if="resolvedScope?.department">
        <div class="bold">大宗戶</div>
        {{ resolvedScope.department }}
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
.zipcode-section
  position: relative
.zipcode-label-row
  display: flex
  align-items: center
  gap: .35em
.zipcode-value
  margin-top: .1em
  font-size: 22px
  font-weight: 700
.matched-rule-caption
  display: block
  margin-top: .1em
  font-size: 13px
  opacity: .75
.rules-disclosure
  display: flex
.rules-info-button
  all: unset
  display: inline-flex
  align-items: center
  justify-content: center
  width: 1.5em
  height: 1.5em
  cursor: pointer
  opacity: .6
  border-radius: 50%
  transition: opacity .15s ease, background-color .15s ease
  &:hover,
  &:focus-visible
    opacity: 1
    background-color: var(--tertiary-background-color)
  &:focus-visible
    outline: 2px solid var(--border-focus-color)
    outline-offset: 2px
.rules-popover
  position: absolute
  top: 2em
  left: 0
  z-index: 10
  width: min(420px, 100%)
  max-height: 320px
  overflow-y: auto
  overscroll-behavior: contain
  padding: .75em
  background-color: var(--background-color)
  border: 1px solid var(--border-color)
  border-radius: var(--border-radius)
  box-shadow: 0 12px 32px rgba(0,0,0,.18)
.rules-popover-title
  padding: 0 .25em .5em
  font-size: 13px
  font-weight: 700
.rules-list
  list-style: none
  margin: 0
  padding: 0
.rules-list-item
  display: grid
  grid-template-columns: 5.25em minmax(0, 1fr)
  gap: .5em
  padding: .45em .5em
  font-size: 13px
  border-top: 1px solid var(--border-color)
  overflow-wrap: anywhere
  &.is-active
    background-color: var(--tertiary-background-color)
    border-radius: calc(var(--border-radius) / 2)
.rules-list-zipcode
  font-weight: 700
.rules-list-department
  display: block
  font-weight: 700
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
  button.result-item
    all: unset
    box-sizing: border-box
    width: 100%
    color: inherit
    text-align: left
    cursor: pointer
    &:focus-visible
      outline: 2px solid var(--border-focus-color)
      outline-offset: -2px
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
import {
  getZipcodeScopeMatchBasis,
  parseAddressSuffix,
  resolveZipcodeScopes
} from "./utils/zipcodeScopeMatcher.js";
export default {
  components: {
    simpleTypeahead
  },
  data() {
    return {
      addressList: {},
      zhEnAddressList: {},
      addressInput: "",
      isDetailOpen: false,
      manuallySelectedScope: null,
      isRulesInfoPinned: false,
      isRulesInfoHovered: false,
      isRulesInfoHoverSuppressed: false,
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
    scopeResolution() {
      if (!this.isDetailOpen || !this.addressInput) {
        return { status: "empty", matches: [], pending: [] };
      }

      return resolveZipcodeScopes(
        this.addressList[this.addressInput] || [],
        this.addressForm
      );
    },
    currentRoadScopes() {
      return this.addressList[this.addressInput] || [];
    },
    hasAddressForm() {
      return Boolean(this.addressForm.trim());
    },
    baseZipcodePrefixes() {
      return [...new Set(this.currentRoadScopes
        .map(rule => String(rule.zipcode || "").slice(0, 3))
        .filter(Boolean))];
    },
    displayedZipcode() {
      if (this.hasAddressForm) {
        return this.resolvedScope?.zipcode ? String(this.resolvedScope.zipcode) : "";
      }
      return this.baseZipcodePrefixes.length === 1 ? this.baseZipcodePrefixes[0] : "";
    },
    isRulesInfoVisible() {
      return this.isRulesInfoPinned || (
        this.isRulesInfoHovered && !this.isRulesInfoHoverSuppressed
      );
    },
    matchedRuleBasis() {
      if (!this.resolvedScope || !this.hasAddressForm) return "";
      return getZipcodeScopeMatchBasis(this.resolvedScope, this.addressForm)?.text || "";
    },
    resolvedScope() {
      if (
        this.manuallySelectedScope &&
        this.scopeResolution.matches?.includes(this.manuallySelectedScope)
      ) {
        return this.manuallySelectedScope;
      }
      if (this.scopeResolution.status === "matched") {
        return this.scopeResolution.matches[0] || null;
      }
      if (this.scopeResolution.status === "empty") {
        if (this.manuallySelectedScope) return this.manuallySelectedScope;
        const scopes = this.addressList[this.addressInput] || [];
        if (scopes.length === 1 && scopes[0].scope.normalize("NFKC").replace(/\s+/g, "") === "全") {
          return scopes[0];
        }
      }
      return null;
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
        basement: false,
        room: null,
      }
      if (!this.addressInput || !this.zhEnAddressList[this.addressInput]) return {
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

      const parsedAddress = parseAddressSuffix(addressForm)
      form.ln = parsedAddress.ln
      form.aly = parsedAddress.aly
      form.no = parsedAddress.no
      form.noDash = parsedAddress.noDash
      form.floor = parsedAddress.floor
      form.floorDash = parsedAddress.floorDash
      form.basement = parsedAddress.basement
      form.room = addressForm.match(/([\dA-Za-z]+)室/)?.[1] || null
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
        zh += (form.basement ? "地下" : "") + form.floor + "樓"
        if (form.floorDash) {
          zh += "之" + form.floorDash + " "
          en.push((form.basement ? "B" : "") + form.floor + "F-" + form.floorDash)
        } else {
          en.push((form.basement ? "B" : "") + form.floor + "F")
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
      this.addressForm = addressForm || "";
      this.isDetailOpen = Boolean(address && this.addressList[address]);
      this.manuallySelectedScope = (this.addressList[address] || [])
        .find(item => item.zipcode === zipcode) || null;
    }
  },
  watch: {
    isDetailOpen() {
      this.updateHash()
    },
    addressInput() {
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
    formatScopeRule(scope) {
      return String(scope || "")
        .normalize("NFKC")
        .replace(/\s+/gu, " ")
        .trim();
    },
    displayRuleZipcode(zipcode) {
      const normalized = String(zipcode || "");
      return this.hasAddressForm ? normalized : normalized.slice(0, 3);
    },
    showRulesInfoOnHover() {
      this.isRulesInfoHovered = true;
      this.isRulesInfoHoverSuppressed = false;
    },
    hideRulesInfoOnHover() {
      this.isRulesInfoHovered = false;
      this.isRulesInfoHoverSuppressed = false;
    },
    toggleRulesInfo() {
      if (this.isRulesInfoPinned) {
        this.isRulesInfoPinned = false;
        this.isRulesInfoHoverSuppressed = true;
        return;
      }
      this.isRulesInfoPinned = true;
      this.isRulesInfoHoverSuppressed = false;
    },
    closeRulesInfo() {
      this.isRulesInfoPinned = false;
      this.isRulesInfoHoverSuppressed = true;
    },
    openDetail(address, scope = null) {
      this.addressInput = address;
      this.addressForm = "";
      this.manuallySelectedScope = scope;
      this.isRulesInfoPinned = false;
      this.isRulesInfoHovered = false;
      this.isRulesInfoHoverSuppressed = false;
      this.isDetailOpen = true;
      this.$nextTick(() => {
        const input = this.$refs.addressFormInput;
        if (!input) return;
        input.focus();
        input.setSelectionRange?.(input.value.length, input.value.length);
      });
    },
    returnToSearch() {
      this.isDetailOpen = false;
      this.manuallySelectedScope = null;
      this.isRulesInfoPinned = false;
      this.isRulesInfoHovered = false;
      this.isRulesInfoHoverSuppressed = false;
      this.addressForm = "";
      this.$nextTick(() => this.$refs.searchInput?.focusInput());
    },
    updateHash() {
      let selectedZipcode = this.resolvedScope?.zipcode || ""
      let addressInput = this.addressInput
      let addressForm = this.addressForm
      if (!this.isDetailOpen || !addressInput) {
        window.location.hash = "";
        return;
      }
      window.location.hash = selectedZipcode + "_" + addressInput + '_' + addressForm;
    }
  }

}
</script>
