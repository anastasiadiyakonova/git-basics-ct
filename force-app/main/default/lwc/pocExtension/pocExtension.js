import { LightningElement, api, track, wire } from 'lwc';
import {CurrentPageReference} from 'lightning/navigation';
import {CloseActionScreenEvent} from "lightning/actions";
import {ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPOCDetails from '@salesforce/apex/POCExtensionController.getPOCDetails';
import requestPOCExtension from '@salesforce/apex/POCExtensionController.requestPOCExtension';

export default class PocExtension extends LightningElement {
    @api recordId;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state.recordId;
        }
    }

  
    @track isModalOpen = false; 
    @track currentPOCDetails = {};
    @track extendedPOCEndDate;
    @track pocExtensionReason;
    @track status;
    @track isLoading = false; 


    get isPOCExtensionRequested() {
        return this.status === 'POC Extension Requested';
    }

    connectedCallback() {
        this.checkPOCStatus();
    }

    checkPOCStatus() {
        getPOCDetails({ opportunityId: this.recordId })
            .then(result => {
                this.status = result.status;
                if (!this.isPOCExtensionRequested) {
                    this.currentPOCDetails = {
                        startDate: result.startDate,
                        endDate: result.endDate
                    };
                } else {
                    this.currentPOCDetails = {
                        extendedEndDate: result.extendedEndDate,
                        reason: result.reason
                    };
                }
                this.isModalOpen = true;
            })
            .catch(error => {
                this.showErrorToast(error);
            });
    }

    handleInputChange(event) {
        const field = event.target.name;
        if (field === 'extendedEndDate') {
            this.extendedPOCEndDate = event.target.value;
        } else if (field === 'pocExtensionReason') {
            this.pocExtensionReason = event.target.value;
        }
    }

    handleSubmit() {
        if (this.extendedPOCEndDate && this.pocExtensionReason) {
            this.isLoading = true;
            requestPOCExtension({
                opportunityId: this.recordId,
                extendedEndDate: this.extendedPOCEndDate,
                reason: this.pocExtensionReason
            })
                .then(() => {
                    this.isLoading = false;
                    this.showSuccessToast();
                    this.closeQuickAction();
                    this.status = 'POC Extension Requested';
                })
                .catch(error => {
                    this.isLoading = false;
                    this.showErrorToast(error);
                });
        } else {
            this.showErrorToast('All fields are required.');
        }
    }

    closeQuickAction() {
        this.dispatchEvent(new CustomEvent("close"));
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    showSuccessToast() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'POC Extension Request Sent',
                variant: 'success'
            })
        );
    }

    showErrorToast(error) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: error.body.message,
                variant: 'error'
            })
        );
    }
}