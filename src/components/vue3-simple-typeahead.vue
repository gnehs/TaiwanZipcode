<template>
  <div :id="wrapperId" class="simple-typeahead">
    <input
      ref="inputRef"
      :id="inputId"
      class="simple-typeahead-input"
      type="text"
      :placeholder="placeholder"
      v-model="input"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.down.prevent="onArrowDown"
      @keydown.up.prevent="onArrowUp"
      @keydown.enter="selectCurrentSelection"
      @keydown.tab="selectCurrentSelectionTab"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      :aria-expanded="isListVisible"
      :aria-controls="listId"
      :aria-activedescendant="activeDescendantId"
      v-bind="$attrs"
    />
    <div v-if="isListVisible" :id="listId" class="simple-typeahead-list" role="listbox">
      <div class="simple-typeahead-list-header" v-if="$slots['list-header']">
        <slot name="list-header"></slot>
      </div>
      <div
        class="simple-typeahead-list-item"
        :id="optionId(index)"
        :class="{ 'simple-typeahead-list-item-active': currentSelectionIndex === index }"
        role="option"
        :aria-selected="currentSelectionIndex === index"
        v-for="(item, index) in filteredItems"
        :key="index"
        @mousedown.prevent
        @click="selectItem(item)"
        @mouseenter="currentSelectionIndex = index"
      >
        <span
          class="simple-typeahead-list-item-text"
          :data-text="itemProjection(item)"
          v-html="boldMatchText(itemProjection(item))"
        ></span>
      </div>
      <div class="simple-typeahead-list-footer" v-if="$slots['list-footer']">
        <slot name="list-footer"></slot>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default /*#__PURE__*/ defineComponent({
  name: 'Vue3SimpleTypeahead',
  emits: ['onInput', 'onFocus', 'onBlur', 'selectItem', 'update:modelValue', 'submit'],
  inheritAttrs: false,
  props: {
    id: {
      type: String,
    },
    modelValue: {
      type: String,
    },
    placeholder: {
      type: String,
      default: '',
    },
    items: {
      type: Array,
      required: true,
    },
    defaultItem: {
      default: null,
    },
    itemProjection: {
      type: Function,
      default(item) {
        return item;
      },
    },
    minInputLength: {
      type: Number,
      default: 2,
      validator: (prop) => {
        return prop >= 0;
      },
    },
  },
  mounted() {
    this.input = this.normalizeInputValue(this.modelValue);
    if (this.defaultItem !== undefined && this.defaultItem !== null) {
      this.selectItem(this.defaultItem);
    }
  },
  data() {
    return {
      inputId: this.id || `simple_typeahead_${(Math.random() * 1000).toFixed()}`,
      input: '',
      isInputFocused: false,
      isSelectionMade: false,
      currentSelectionIndex: 0,
    };
  },
  watch: {
    modelValue(value) {
      const nextInput = this.normalizeInputValue(value);
      if (nextInput === this.input) {
        return;
      }

      this.input = nextInput;
      this.currentSelectionIndex = 0;
      this.isSelectionMade = false;
    },
  },
  methods: {
    normalizeInputValue(value) {
      return value === undefined || value === null ? '' : String(value);
    },
    optionId(index) {
      return `${this.inputId}_option_${index}`;
    },
    onInput() {
      // A real input event means the user is continuing to edit the selected
      // suggestion, so normal filtering can be shown again.
      this.isSelectionMade = false;
      if (this.isListVisible && this.currentSelectionIndex >= this.filteredItems.length) {
        this.currentSelectionIndex = (this.filteredItems.length || 1) - 1;
      }
      this.$emit('update:modelValue', this.input);
      this.$emit('onInput', { input: this.input, items: this.filteredItems });
    },
    onFocus() {
      if (this.isInputFocused) {
        return;
      }

      this.isInputFocused = true;
      this.$emit('onFocus', { input: this.input, items: this.filteredItems });
    },
    onBlur() {
      if (!this.isInputFocused) {
        return;
      }

      this.isInputFocused = false;
      this.$emit('onBlur', { input: this.input, items: this.filteredItems });
    },
    onArrowDown($event) {
      if (this.isListVisible && this.currentSelectionIndex < this.filteredItems.length - 1) {
        this.currentSelectionIndex++;
      }
      this.scrollSelectionIntoView();
    },
    onArrowUp($event) {
      if (this.isListVisible && this.currentSelectionIndex > 0) {
        this.currentSelectionIndex--;
      }
      this.scrollSelectionIntoView();
    },
    scrollSelectionIntoView() {
      if (!this.isListVisible || typeof document === 'undefined') {
        return;
      }

      this.$nextTick(() => {
        const activeNode = document.getElementById(this.optionId(this.currentSelectionIndex));
        if (!activeNode || typeof activeNode.scrollIntoView !== 'function') {
          return;
        }

        activeNode.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
        });
      });
    },
    selectCurrentSelection($event) {
      // During IME composition Enter confirms the composition rather than a
      // typeahead option. keyCode 229 covers browsers that do not expose the
      // composition flag consistently on the keydown event.
      if ($event && ($event.isComposing || $event.keyCode === 229)) {
        return;
      }

      // Enter is handled by the component, whether it selects an option or
      // submits the current free-form input, so it must not also submit a
      // surrounding native form.
      if ($event && typeof $event.preventDefault === 'function') {
        $event.preventDefault();
      }

      const selection = this.currentSelection;
      if (selection !== undefined) {
        this.selectItem(selection);
        return;
      }

      this.$emit('submit', { input: this.input, items: this.filteredItems });
    },
    selectCurrentSelectionTab($event) {
      const selection = this.currentSelection;
      if (selection === undefined) {
        return;
      }

      if ($event && typeof $event.preventDefault === 'function') {
        $event.preventDefault();
      }
      this.selectItem(selection);
    },
    selectItem(item) {
      this.input = this.itemProjection(item);
      this.currentSelectionIndex = 0;
      this.isSelectionMade = true;
      this.$emit('update:modelValue', this.input);
      this.$emit('selectItem', item);

      // Mouse selection uses mousedown.prevent to keep the input focused. A
      // next-tick focus also handles keyboard/programmatic selection after
      // Vue has patched the new input value, placing the caret at the end.
      if (!this.isInputFocused) {
        return;
      }

      this.$nextTick(() => {
        const input = this.$refs.inputRef;
        if (!input) {
          return;
        }

        input.focus();
        const end = input.value.length;
        if (typeof input.setSelectionRange === 'function') {
          input.setSelectionRange(end, end);
        }
      });
    },
    escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },
    boldMatchText(text) {
      let result = text
      let keyword = this.input.trim().replaceAll('台', '臺')
      for (let input of keyword.split(' ').filter(x => x.length)) {
        result = result.split(input).join(`<strong>${input}</strong>`)
      }
      return result
    },
    clearInput() {
      this.input = '';
      this.currentSelectionIndex = 0;
      this.isSelectionMade = false;
      this.$emit('update:modelValue', this.input);
      this.$emit('onInput', { input: this.input, items: this.filteredItems });
    },
    getInput() {
      return this.$refs.inputRef;
    },
    focusInput() {
      const input = this.$refs.inputRef;
      if (input) {
        input.focus();
      }
    },
    blurInput() {
      const input = this.$refs.inputRef;
      if (input) {
        input.blur();
      }
    },
  },
  computed: {
    wrapperId() {
      return `${this.inputId}_wrapper`;
    },
    listId() {
      return `${this.inputId}_list`;
    },
    activeDescendantId() {
      return this.currentSelection === undefined ? undefined : this.optionId(this.currentSelectionIndex);
    },
    filteredItems() {
      let keyword = this.input.trim().replaceAll('台', '臺')
      let filteredItems = this.items
        .filter(item =>
          keyword
            .split(' ')
            .every(x => this.itemProjection(item).includes(x))
        )
        .slice(0, 100);
      return filteredItems
    },
    isListVisible() {
      return this.isInputFocused && !this.isSelectionMade && this.input.length >= this.minInputLength && this.filteredItems.length > 0;
    },
    currentSelection() {
      return this.isListVisible && this.currentSelectionIndex < this.filteredItems.length ? this.filteredItems[this.currentSelectionIndex] : undefined;
    },
  },
});
</script>
