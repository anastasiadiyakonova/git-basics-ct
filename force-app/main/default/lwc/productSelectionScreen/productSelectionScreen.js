import { LightningElement, api, track } from 'lwc';
import searchProducts from "@salesforce/apex/CtrAddProductScreen.searchInProduct"
import getDefaultProduct from "@salesforce/apex/CtrAddProductScreen.getProductByPricebook"

export default class ProductSelectionScreen extends LightningElement {

    @api recordid;
    @api recordname;
    @api pricebook;
    @api backactiondata;

    searchKey;
    productListFound = [];
    defaultProductList = [];
    objectApiName = "Product"

    productListSelected = [];
    @track selectedRowIds = [];

    columns = [
        { label: "Product", fieldName: "productName" },
        { label: "Family", fieldName: "family" },
        { label: "Territory List", fieldName: "territory" },
        { label: "Edition Type", fieldName: "editionType" },
        { label: "Fee Type", fieldName: "feeType" },
        { label: "Currency", fieldName: "currency", initialWidth: 150 },
        { label: "List Price", fieldName: "listPrice", initialWidth: 150 }
    ];

    connectedCallback() {
        try {
            this.dispatchSpinnerEvent(true);

            getDefaultProduct({ pbId: this.pricebook.value })
                .then((data) => {
                    this.dispatchSpinnerEvent(false);

                    if (this.backactiondata?.length > 0) {
                        this.productListSelected = this.backactiondata;
                        this.selectedRowIds = this.productListSelected.map(item => item.id);
                    }

                    this.productListFound = data.filter(item => !this.selectedRowIds.includes(item.Product2Id)).map(item => {
                        console.log("productSelection item.Cost__c," + item.Cost__c);
                        return {
                            pbeId: item.Id,
                            id: item.Product2Id,
                            productName: item.Product2?.Name,
                            family: item.Product2.Family,
                            territory: item.Product2.TerritoryList__c,
                            editionType: item.Product2?.EditionType__c,
                            feeType: item.Product2?.FeeType__c,
                            currency: item.CurrencyIsoCode,
                            listPrice: item.UnitPrice,
                            listCost: item.Cost__c,
                            autoDiscount: item.Product2.AutoDiscount__c,
                            icpCheck: item.Product2.Non_ICP_Check__c
                        };
                    });

                    this.defaultProductList = this.productListFound;
                    this.productListFound = [...this.productListSelected, ...this.productListFound];
                })
                .catch((error) => {
                    this.dispatchSpinnerEvent(false);
                    console.log("error.getDefaultProduct" + error.body.message);
                });
        } catch (error) {
            console.log("catch.connectedCallback: " + JSON.stringify(error));
        }
    }

    onchangeSearchField(event) {
        try {
            this.searchKey = event.detail.value;

            if (this.searchKey?.length < 2) {
                this.productListFound = this.defaultProductList;
                return;
            }

            searchProducts({ searchKey: this.searchKey, pbId: this.pricebook.value, selectedIds: this.selectedRowIds })
                .then(data => {
                    this.productListFound = data.map(item => {
                        console.log("item.Cost__c," + item.Cost__c);
                        return {
                            pbeId: item.Id,
                            id: item.Product2Id,
                            productName: item.Product2?.Name,
                            family: item.Product2.Family,
                            territory: item.Product2.TerritoryList__c,
                            editionType: item.Product2?.EditionType__c,
                            feeType: item.Product2?.FeeType__c,
                            currency: item.CurrencyIsoCode,
                            listPrice: item.UnitPrice,
                            listCost: item.Cost__c,
                            autoDiscount: item.Product2.AutoDiscount__c,
                            icpCheck: item.Product2.Non_ICP_Check__c
                        };
                    });
                    console.log("this.productListFound" + this.productListFound);
                    this.productListFound = [...this.productListSelected, ...this.productListFound];
                    this.selectedRowIds = this.productListSelected.map(item => item.id);
                })
                .catch(error => {
                    console.log("error.searchProduct: " + error);
                });
        } catch (error) {
            console.log("catch.onchangeSearchField: " + JSON.stringify(error));
        }
    }

    onselectRow(event) {
        const products = event.detail.selectedRows;
        console.log("products " + products);
        for (let prod of products) {
            if (this.selectedRowIds.includes(prod.id)) continue;

            this.productListSelected.push(prod);
            this.selectedRowIds.push(prod.id);
        }
    }

    onclickCancel() {
        // Fire "closescreen" event to parent component to close action.
        this.dispatchEvent(new CustomEvent("closescreen"));
    }

    onclickNext() {
        // Fire "pricingpage" event to parent component to close action.
        this.dispatchEvent(new CustomEvent("pricingpage", { detail: this.productListSelected }));
    }

    dispatchSpinnerEvent(status) {
        // Fire "spinnerevent" event to parent component to close action.
        this.dispatchEvent(new CustomEvent("spinnerevent", { detail: status }));
    }
}