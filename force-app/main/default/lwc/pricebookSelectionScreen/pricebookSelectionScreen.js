import { LightningElement } from "lwc";
import getPricebook from "@salesforce/apex/CtrAddProductScreen.getPricebook";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PricebookSelectionScreen extends LightningElement {

    // pricebook value list for combobox
    options = [];

    // selected pricebook value
    selectedPb;

    connectedCallback() {
        getPricebook()
        .then((data) => {
            this.options = data ? data.map(item => {
                return {
                    label: item.Name,
                    value: item.Id
                }
            }) : [];
        })
        .catch((error) => {
            this.showToast("Error", error.body.message, "error");
        });
    }

    handleChange(event) {
        const pbId = event.detail.value;

        this.selectedPb = this.options.find(item => item.value === pbId);
    }

    onclickCancel() {
        // Fire "closescreen" event to parent component to close action.
        this.dispatchEvent(new CustomEvent("closescreen"));
    }

    onclickNext() {
        // Fire "product-page" event to parent component to show product selection page.
        this.dispatchEvent(new CustomEvent("productpage", {detail: this.selectedPb}));
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}