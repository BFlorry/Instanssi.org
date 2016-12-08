/* global Vue2 */
toLocaleStringSupportsOptions = !!(typeof Intl == 'object' && Intl && typeof Intl.NumberFormat == 'function');
function formatPriceLocaleString(price) {
    return price.toLocaleString('fi', { style: 'currency', currency: 'EUR' });
}
function formatPriceLegacy(price) {
    return price.toFixed(2) + ' €';
}
var formatPrice;
if (toLocaleStringSupportsOptions) {
    formatPrice = formatPriceLocaleString;
}
else {
    formatPrice = formatPriceLegacy;
}
Vue.filter('formatPrice', formatPrice);
Vue.component('store-product', {
    props: {
        product: Object
    },
    data: function () {
        return {
            variant: null,
        };
    },
    methods: {
        addItem: function () {
            this.$emit('addItem', this.product, this.variant);
        }
    },
    created: function () {
        var product = this.product;
        if (product.variants && product.variants.length) {
            this.variant = product.variants[0];
        }
    },
    template: "\n    <div class=\"product\">\n        <span class=\"pull-right\">\n            <select v-if=\"product.variants\" v-model=\"variant\">\n                <option v-for=\"variant in product.variants\" v-bind:value=\"variant\">\n                    {{ variant.title }}\n                </option>\n            </select>\n            <button v-on:click=\"addItem()\">Lis\u00E4\u00E4 <span class=\"fa fa-shopping-cart\"/></button>\n        </span>\n        <div>\n            <img :src=\"product.imagefile_thumbnail_url\" width=\"48\" height=\"48\" />\n            {{ product.name }} ({{ product.price | formatPrice }})\n            <p class=\"small\" v-if=\"product.description\" v-html=\"product.description\"></p>\n            <p v-if=\"product.discount_amount > 0\">\n                <span class=\"fa fa-info\"/>\n                {{ product.discount_percentage }} % alennus, jos ostat ainakin {{ product.discount_amount }} kappaletta!\n            </p>\n        </div>\n        <span class=\"clearfix\"></span>\n    </div>\n    ",
});
function storeXHR(method, path, data) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
            resolve(JSON.parse(xhr.responseText));
        };
        xhr.onerror = function () {
            reject(xhr.responseText ? JSON.parse(xhr.responseText) : null);
        };
        xhr.open(method, path);
        if (data) {
            xhr.data = JSON.stringify(data);
        }
        xhr.send();
    });
}
var app = new Vue({
    el: '#store',
    data: {
        products: [],
        items: [],
        totalPrice: 0
    },
    template: "\n<div>\n<h3>Tuotteet</h3>\n<div class=\"list-unstyled store-items\">\n    <store-product v-for=\"product in products\" :product=\"product\"\n        v-on:addItem=\"addItem\" />\n</div>\n<h3>Ostoskori</h3>\n<div class=\"list-unstyled store-items\">\n    <div v-for=\"item in items\">\n        <div class=\"pull-left\">\n            <span>{{ item.product.name }}</span>\n            <span v-if=\"item.variant\">({{ item.variant.name }})</span>\n        </div>\n        <span class=\"pull-right\">\n            x {{ item.count }} = {{ getSubtotal(item) | formatPrice }}\n            <button v-on:click=\"changeItemCount(item, 1)\">+</button>\n            <button v-on:click=\"changeItemCount(item, -1)\">-</button>\n            <button v-on:click=\"removeItem(item)\">\n                <span class=\"fa fa-fw fa-trash\"></span>\n            </button>\n        </span>\n        <span class=\"clearfix\"></span>\n    </div>\n    <div>Yhteens\u00E4: {{ totalPrice | formatPrice }}</div>\n</div>\n<h3>Tiedot</h3>\n<form class=\"form-horizontal\">\n    <p>Huomaathan, ett\u00E4 lippukoodit l\u00E4hetet\u00E4\u00E4n annettuun s\u00E4hk\u00F6postiosoitteeseen.</p>\n    <div class=\"form-group\">\n        <label class=\"col-sm-4 control-label\">Nimi</label>\n        <div class=\"col-sm-8\">\n            <input class=\"form-control\"></input>\n        </div>\n    </div>\n    <div class=\"form-group\">\n        <label class=\"col-sm-4 control-label\">S\u00E4hk\u00F6posti</label>\n        <div class=\"col-sm-8\">\n            <input class=\"form-control\"></input>\n        </div>\n    </div>\n    <div class=\"form-group\">\n        <label class=\"col-sm-4 control-label\">Katuosoite</label>\n        <div class=\"col-sm-8\">\n            <input class=\"form-control\"></input>\n        </div>\n    </div>\n    <div class=\"form-group\">\n        <label class=\"col-sm-4 control-label\">Postinumero</label>\n        <div class=\"col-sm-8\">\n            <input class=\"form-control\"></input>\n        </div>\n    </div>\n    <div class=\"form-group\">\n        <label class=\"col-sm-4 control-label\">Kaupunki</label>\n        <div class=\"col-sm-8\">\n            <input class=\"form-control\"></input>\n        </div>\n    </div>\n    <div class=\"form-group\">\n        <label class=\"col-sm-4 control-label\">Puhelin</label>\n        <div class=\"col-sm-8\">\n            <input class=\"form-control\"></input>\n        </div>\n    </div>\n    <span class=\"pull-right\">\n        <button class=\"btn btn-primary\">Jatka &gt;</button>\n    </span>\n    <div class=\"clearfix\"></div>\n</form>\n</div>\n  ",
    created: function () {
        var _this = this;
        storeXHR('GET', '/api/store_items/?format=json').then(function (items) {
            items.forEach(function (item) {
                item.price = parseFloat(item.price);
            });
            _this.products = items;
        }).catch(function (e) {
            console.error('error fetching store items:', e);
        });
        // FIXME: Fetch cart from window.localstorage if it exists
    },
    methods: {
        getSubtotal: function (item) {
            var multiplier = 1;
            var qtyThresh = item.product.discount_amount;
            var discountFactor = (100 - item.product.discount_percentage) / 100;
            if (qtyThresh && item.count >= qtyThresh) {
                multiplier *= discountFactor;
            }
            return item.product.price * item.count * multiplier;
        },
        updateCart: function () {
            var totalPrice = 0;
            var component = this;
            this.items.forEach(function (item) {
                totalPrice += component.getSubtotal(item);
            });
            this.totalPrice = totalPrice;
            // FIXME: Store cart in window.localStorage
        },
        addItem: function (product, variant) {
            // check if product/variant is already in items
            var found = this.items.findIndex(function (item) {
                return item.product.id === product.id && (!variant || (item.variant && (variant.id === item.variant.id)));
            });
            if (found >= 0) {
                // if it is, splice a new item with a higher count
                var newItem = Object.assign({}, this.items[found]);
                newItem.count++;
                this.items.splice(found, 1, newItem);
            }
            else {
                // if it isn't, push a new item
                this.items.push({
                    count: 1,
                    product: product,
                    variant: variant
                });
            }
            this.updateCart();
        },
        removeItem: function (item) {
            var pos = this.items.indexOf(item);
            this.items.splice(pos, 1);
            this.updateCart();
        },
        changeItemCount: function (item, change) {
            // FIXME: Check item product max per order
            var pos = this.items.indexOf(item);
            var item = this.items[pos];
            if (item.count + change <= 0) {
                return this.removeItem(item);
            }
            item.count += change;
            this.items.splice(pos, 1, item);
            this.updateCart();
        },
        submit: function () {
            // send request to API, get payment methods, whatever.
            // clear localStorage afterwards
        }
    }
});
