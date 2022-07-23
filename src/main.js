import { createApp } from 'vue'
import 'normalize.css'
import './style.sass'
import App from './App.vue'
import SimpleTypeahead from 'vue3-simple-typeahead';
import 'vue3-simple-typeahead/dist/vue3-simple-typeahead.css'; //Optional default CSS

createApp(App)
  .use(SimpleTypeahead)
  .mount('#app')
