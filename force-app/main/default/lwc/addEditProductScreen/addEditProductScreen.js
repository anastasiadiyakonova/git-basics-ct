import { LightningElement, api, wire } from 'lwc';
import { CloseActionScreenEvent } from "lightning/actions";
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRecord from "@salesforce/apex/CtrAddProductScreen.getRecord";
import modal from "@salesforce/resourceUrl/CustomSizingLWC";
import { loadStyle } from "lightning/platformResourceLoader";

import ID_FIELD from '@salesforce/schema/Opportunity.Id';
import PRICEBOOK_FIELD from '@salesforce/schema/Opportunity.Pricebook2Id';

export default class AddEditProductScreen extends LightningElement {

    _recordId;

    showSpinner = true;
    showPricebookPage = false;
    showProductPage = false;
    showSetPricePage = false;

    // Can be set on Pricebook Page or come from record 
    selectedPb;

    // Opportunity || Quote record data
    record;

    // Property for Selected Product that added on AddEditProductScreen.
    productList = [];

    // Set when user come back second page from third page.
    backActionData = [];

    // LWC custom width setting
    connectedCallback() {
        loadStyle(this, modal);
    }

    // When _recordId is retreived from url, this method is triggred.
    @api set recordId(recId) {
        try {
            this._recordId = recId;

            getRecord({ recordId: recId })
                .then((data) => {
                    this.record = data;
                    this.showProductPage = !!this.record.Pricebook2Id;
                    this.showPricebookPage = !this.showProductPage;
                    this.showSpinner = false;
                    
                    if (this.showProductPage) this.selectedPb = { label: this.record.Pricebook2?.Name, value: this.record.Pricebook2Id };
                })
                .catch((error) => {
                    this.showSpinner = false;
                    this.showToast("Error loading Opportunity", error.body.message, "error");
                })
        } catch (error) {
            console.log("catch.block: " + JSON.stringify(error));
        }
    }

    get recordId() {
        return this._recordId;
    }

    // Triggered from PricebookSelectionScreen
    setPricebook(event) {
        this.selectedPb = event.detail;
        this.showSpinner = true;

        let fields = {};
        fields[ID_FIELD.fieldApiName] = this.recordId;
        fields[PRICEBOOK_FIELD.fieldApiName] = this.selectedPb.value;

        updateRecord({ fields })
            .then(() => {
                this.showToast("Pricebook", "Pricebook was set successfully!", "success");

                this.showSpinner = false;
                this.showProductPage = true;
                this.showPricebookPage = false;

                // Display fresh data in the form
                if (refreshApex) return refreshApex(this.record);
            })
            .catch(error => {
                console.log("error.updateRecord: " + JSON.stringify(error));
            });
    }

    setProductPrice(event) {
        this.productList = event.detail;
        this.showProductPage = false;
        this.showSetPricePage = true;
    }

    backToPrevious(event) {
        this.backActionData = event.detail;
        this.showProductPage = true;
        this.showSetPricePage = false;
    }

    closeAction() {
        // The component is using in Quote(Aura) either, so it is also creating close event for Aura component.
        this.dispatchEvent(new CustomEvent("close"));

        this.dispatchEvent(new CloseActionScreenEvent());
    }

    setSpinnerAction(event) {
        this.showSpinner = event.detail;
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