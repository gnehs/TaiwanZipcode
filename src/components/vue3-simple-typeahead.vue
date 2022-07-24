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
			@keydown.enter.tab.prevent="selectCurrentSelection"
			autocomplete="off"
			v-bind="$attrs" />
		<div v-if="isListVisible" class="simple-typeahead-list">
			<div class="simple-typeahead-list-header" v-if="$slots['list-header']">
				<slot name="list-header"></slot>
			</div>
			<div
				class="simple-typeahead-list-item"
				:class="{ 'simple-typeahead-list-item-active': currentSelectionIndex == index }"
				v-for="(item, index) in filteredItems"
				:key="index"
				@mousedown.prevent
				@click="selectItem(item)"
				@mouseenter="currentSelectionIndex = index">
				<span class="simple-typeahead-list-item-text" :data-text="itemProjection(item)" v-if="$slots['list-item-text']">
					<slot name="list-item-text" :item="item" :itemProjection="itemProjection" :boldMatchText="boldMatchText"></slot>
				</span>
				<span class="simple-typeahead-list-item-text" :data-text="itemProjection(item)" v-html="boldMatchText(itemProjection(item))" v-else></span>
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
	emits: ['onInput', 'onFocus', 'onBlur', 'selectItem'],
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
		if (this.defaultItem !== undefined && this.defaultItem !== null) {
			this.selectItem(this.defaultItem);
		}
		this.input = this.modelValue;
	},
	data() {
		return {
			inputId: this.id || `simple_typeahead_${(Math.random() * 1000).toFixed()}`,
			input: '',
			isInputFocused: false,
			currentSelectionIndex: 0,
		};
	},
	methods: {
		onInput() {
			if (this.isListVisible && this.currentSelectionIndex >= this.filteredItems.length) {
				this.currentSelectionIndex = (this.filteredItems.length || 1) - 1;
			}
			this.$emit('onInput', { input: this.input, items: this.filteredItems });
		},
		onFocus() {
			this.isInputFocused = true;
			this.$emit('onFocus', { input: this.input, items: this.filteredItems });
		},
		onBlur() {
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
			setTimeout(() => {
				const list_node = document.querySelector(`#${this.wrapperId} .simple-typeahead-list`);
				const active_node = document.querySelector(`#${this.wrapperId} .simple-typeahead-list-item.simple-typeahead-list-item-active`);

				if (!(active_node.offsetTop >= list_node.scrollTop && active_node.offsetTop + active_node.offsetHeight < list_node.scrollTop + list_node.offsetHeight)) {
					let scroll_to = 0;
					if (active_node.offsetTop > list_node.scrollTop) {
						scroll_to = active_node.offsetTop + active_node.offsetHeight - list_node.offsetHeight;
					} else if (active_node.offsetTop < list_node.scrollTop) {
						scroll_to = active_node.offsetTop;
					}

					list_node.scrollTo(0, scroll_to);
				}
			});
		},
		selectCurrentSelection() {
			if (this.currentSelection) {
				this.selectItem(this.currentSelection);
			}
		},
		selectItem(item) {
			this.input = this.itemProjection(item);
			this.currentSelectionIndex = 0;
			this.$refs.inputRef.blur();
			this.$emit('selectItem', item);
		},
		escapeRegExp(string) {
			return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		},
		boldMatchText(text) {
			let result = text
			let keyword = this.input.trim().replaceAll('台', '臺')
			for (let input of keyword.split(' ')) {
				const regexp = new RegExp(`(${this.escapeRegExp(input)})`, 'ig');
				result = result.replace(regexp, '<strong>$1</strong>');
			}
			return result
		},
		clearInput() {
			this.input = '';
		},
		getInput() {
			return this.$refs.inputRef;
		},
		focusInput() {
			this.$refs.inputRef.focus();
			this.onFocus();
		},
		blurInput() {
			this.$refs.inputRef.blur();
			this.onBlur();
		},
	},
	computed: {
		wrapperId() {
			return `${this.inputId}_wrapper`;
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
			return this.isInputFocused && this.input.length >= this.minInputLength && this.filteredItems.length;
		},
		currentSelection() {
			return this.isListVisible && this.currentSelectionIndex < this.filteredItems.length ? this.filteredItems[this.currentSelectionIndex] : undefined;
		},
	},
});
</script>