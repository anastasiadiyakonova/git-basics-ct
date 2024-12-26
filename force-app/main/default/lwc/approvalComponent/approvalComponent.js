import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getApprovalStatus from '@salesforce/apex/ApprovalProcessController.getApprovalStatus';
import processApproval from '@salesforce/apex/ApprovalProcessController.processApproval';

export default class ApprovalComponent extends NavigationMixin(LightningElement) {
    @api recordId;
    isPendingApproval = false;
    isRejectModalOpen = false;
    rejectionComment = '';
    isLoading = false;
    targetObjectId;

    @wire(getApprovalStatus, { workitemId: '$recordId' })
    wiredApprovalStatus({ error, data }) {
        if (data) {
            this.isPendingApproval = data === 'Pending';
        } else if (error) {
            this.showToast('Error', 'Error retrieving approval status', 'error');
        }
    }

    handleApprove() {
        this.processApproval('Approve', '');
    }

    openRejectModal() {
        this.isRejectModalOpen = true;
    }

    closeRejectModal() {
        this.isRejectModalOpen = false;
        this.rejectionComment = '';
    }

    handleCommentChange(event) {
        this.rejectionComment = event.target.value;
    }

    handleReject() {
        if (!this.rejectionComment) {
            this.showToast('Error', 'Rejection comment is required', 'error');
            return;
        }
        this.isRejectModalOpen = false;
        this.processApproval('Reject', this.rejectionComment);
    }

    processApproval(action, comment) {
        this.isLoading = true;
        processApproval({ workitemId: this.recordId, actionType: action, comment })
            .then(result => {
                this.targetObjectId = result;
                this.showToast('Success', 'Successfully', 'success');
                this.isLoading = false;
                this.closeRejectModal();
                this.navigateToOpportunity();
            })
            .catch(error => {
                this.showToast('Error', 'Error during ${action.toLowerCase()}: ${error.body.message}', 'error');
                this.isLoading = false;
            });
    }

    navigateToOpportunity() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.targetObjectId,
                objectApiName: 'Opportunity',
                actionName: 'view'
            }
        });
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant,
        });
        this.dispatchEvent(event);
    }

    get isRejectDisabled() {
        return !this.rejectionComment;
    }
}