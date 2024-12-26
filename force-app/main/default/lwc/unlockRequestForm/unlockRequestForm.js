import { LightningElement, api, track, wire } from 'lwc';
import {CloseActionScreenEvent} from "lightning/actions";
import {ShowToastEvent } from 'lightning/platformShowToastEvent';
import submitUnlockRequest from '@salesforce/apex/UnlockRequestController.submitUnlockRequest';

export default class UnlockRequestForm extends LightningElement {
    @api recordId;
    @track description = '';
    @track isLoading = false; 

    handleDescriptionChange(event) {
        this.description = event.target.value;
    }

    handleSubmit() {
        const descriptionInput = this.template.querySelector('lightning-textarea');
        if (!descriptionInput.checkValidity()) {
            descriptionInput.reportValidity();
        } else {
        this.isLoading = true;
        submitUnlockRequest({ recordId: this.recordId, description: this.description })
            .then(() => {
                this.isLoading = false;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Unlock request submitted successfully',
                        variant: 'success',
                    }),
                );
                this.closeQuickAction();
            })
            .catch(error => {
                this.isLoading = false;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error submitting request',
                        message: error.body.message,
                        variant: 'error',
                    }),
                );
                this.closeQuickAction();
            });
        }
    }

    closeQuickAction() {
        this.dispatchEvent(new CustomEvent("close"));
        this.dispatchEvent(new CloseActionScreenEvent());
    }
}