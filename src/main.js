import { createApp } from 'vue'
import 'normalize.css'
import App from './App.vue'
import SimpleTypeahead from 'vue3-simple-typeahead';

createApp(App)
  .use(SimpleTypeahead)
  .mount('#app')
