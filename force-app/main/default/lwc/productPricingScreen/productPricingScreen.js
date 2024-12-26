import { LightningElement, api, wire, track } from 'lwc';
import searchDiscount from "@salesforce/apex/CtrAddProductScreen.searchInDiscount"
import searchMtuLimit from "@salesforce/apex/CtrAddProductScreen.searchInMTULimit"
import createLines from "@salesforce/apex/CtrAddProductScreen.createLineItem"
import saveQuoteLines from "@salesforce/apex/CtrAddProductScreen.saveQuoteLines"
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getLines from "@salesforce/apex/CtrAddProductScreen.getLineItems"
import getUserProfileName from "@salesforce/apex/CtrAddProductScreen.getUserProfileName"

export default class ProductPricingScreen extends LightningElement {

    @api record;
    @api recordid;
    @api productlist = [];
    @api pricebooklabel;
    @track productlistCopy = [];
    @api showGetReasonPopup = false;
    @api objectApi = "";
    @track profileName;

    adminFieldsAcess = false;
    industryTypeError = false;
    productLimitError = false;
    existLineItemList = [];
    deletedLineItems = [];
    lessThanLimitProducts = [];
    selectedDiscount;

    totalListFee = 0;
    totalSalesListFee = 0;
    totalEstimatedGross = 0;
    totalCost = 0;
    discountRatio = 0;

    get limitations() {
        return [
            { label: "Monthly", value: "Monthly" },
            { label: "Yearly", value: "Yearly" }
        ]
    }

    @wire(getUserProfileName)
    wiredProfileName({ error, data }) {
        if (data) {
            this.profileName = data;
            if(this.profileName == 'System Administrator' || this.profileName == 'Custom System Administrator' || this.profileName == 'Revenue Operations') {
                this.adminFieldsAcess = true;
            }
            console.error('this.profileName ', this.profileName );
        } else if (error) {
            console.error('Error retrieving profile name:', error);
        }
    }

    connectedCallback() {
        this.objectApi = this.recordid.startsWith("006") ? "Opportunity" : "Quote";
        let existProductIds = [];

        // Get Existing line items
        getLines({ recordId: this.recordid })
            .then((data) => {
                this.existLineItemList = data;

                for (let item of data) {
                    existProductIds.push(item.Product2Id);

                    const isExp = this.checkIsExceptionalCalculation(item.Product2?.FeeType__c);
                    let amount = item.ListPrice * item.Quantity;
                    this.productlistCopy.push({
                        lineId: item.Id,
                        id: item.Product2Id,
                        productName: item.Product2?.Name,
                        amount: amount,
                        listPrice: item.ListPrice,
                        quantity: item.Quantity,
                        estimatedCost: item.EstimatedCost__c,
                        estimatedCostTotal: item.EstimatedCost__c * item.Quantity,
                        discountedPrice: item.DiscountedPrice__c ? item.DiscountedPrice__c : 0,
                        subTotal: amount - (item.DiscountedPrice__c ? item.DiscountedPrice__c : 0),
                        salesDiscount: isExp ? item.FlexFeeDiscount__c : item.Discount,
                        totalPrice: isExp ? Number(item.FlexFeeTotal__c)?.toFixed(6) : Number(item.TotalPrice)?.toFixed(4),
                        ppu: item.PPU__c,
                        unitPrice: item.UnitPrice,
                        pbeId: item.PricebookEntryId,
                        autoDiscount: item.Product2?.AutoDiscount__c,
                        autoDiscountRate: item.AutoDiscount__c,
                        period: item.LimitationPeriod__c,
                        feeType: item.Product2?.FeeType__c,
                        icpCheck: item.Product2.Non_ICP_Check__c
                    });
                }

                // Merge products that selected previous page and exist line items.
                for (let prod of this.productlist) {
                    if (existProductIds.includes(prod.id)) continue;

                    this.productlistCopy.push(Object.assign({}, prod));
                }

                this.calculateFeeValues();
            })
            .catch((error) => {
                console.log("catch.connectedCallback" + error + ", " + JSON.stringify(error));
            });
    }

    onblurQuantity(event) {
        try {
            this.dispatchSpinnerEvent(true);

            let quantity = event.currentTarget.value;
            if (!quantity) quantity = 0;

            const prodId = event.currentTarget.dataset.id;

            // used the 'findIndex' function to find selectedProd because 'filter' function return value dont accept changes on it. (doing deep copy)
            const prodIndex = this.productlistCopy.findIndex(item => item.id === prodId);
            const prod = this.productlistCopy[prodIndex];

            let differential = 0;

            if (prod.autoDiscount) {
                searchDiscount({ quantity: quantity })
                .then(data => {
                    this.selectedDiscount = data[0];

                    if (this.selectedDiscount?.Differential__c)
                        differential = (this.selectedDiscount.Differential__c / 100);

                    this.applyAutoDiscount(prod, quantity, differential);
                })
                .catch(error => {
                    console.log("error.searchDiscount: " + JSON.stringify(error));
                    this.dispatchSpinnerEvent(false);
                });
            }
            else this.applyAutoDiscount(prod, quantity, differential);

        } catch (error) {
            console.log("catch.onblurQuantity" + JSON.stringify(error));
        }
    }

    applyAutoDiscount(prod, quantity, differential) {
        prod.quantity = quantity;
        prod.autoDiscountRate = (differential * 100);
        prod.amount = (quantity * prod.listPrice).toFixed(6);
        prod.estimatedCost = typeof prod.listCost === 'undefined' ? prod.estimatedCost : prod.listCost;
        prod.estimatedCostTotal = (prod.estimatedCost * quantity).toFixed(6);
        
        prod.discountedPrice = (differential === 0) ? 0 : (prod.amount * differential).toFixed(6);
        prod.subTotal = (differential === 0) ? prod.amount : (prod.amount - prod.discountedPrice).toFixed(6);
        prod.salesDiscount = (prod.salesDiscount) ? prod.salesDiscount : 0;
        prod.totalPrice = (prod.subTotal * (1 - (prod.salesDiscount / 100))).toFixed(6);
        prod.ppu = (prod.totalPrice / quantity).toFixed(6);
        prod.unitPrice = (prod.listPrice * (1 - prod.autoDiscountRate / 100)).toFixed(6);
    
        this.calculateFeeValues();
        this.dispatchSpinnerEvent(false);
    }
    
/*
    onblurSalesDiscount(event) {
        try {
            this.dispatchSpinnerEvent(true);

            const salesdiscount = event.currentTarget.value;

            if (salesdiscount > 100) {
                this.showToast("Warning", "Discount amount can not be greater than 100", "warning");
                event.currentTarget.value = 0;
                this.dispatchSpinnerEvent(false);
                return;
            }

            const prodId = event.currentTarget.dataset.id;
            const prodIndex = this.productlistCopy.findIndex(item => item.id === prodId);
            const prod = this.productlistCopy[prodIndex];

            prod.subTotal = (prod.subTotal) ? prod.subTotal : 0;
            prod.salesDiscount = salesdiscount;
            prod.totalPrice = (prod.subTotal * (1 - (prod.salesDiscount / 100))).toFixed(6);
            prod.ppu = prod.totalPrice / prod.quantity;
            prod.unitPrice = prod.listPrice * (1 - prod.autoDiscountRate / 100);

            this.calculateFeeValues();
            this.dispatchSpinnerEvent(false);

        } catch (error) {
            console.log("catch.onblurSalesDiscount" + error);
        }
    }
*/
    onblurTotalPrice(event) {
        try {
            const totalPriceNew = Number(event.currentTarget.value);
            console.log("totalPriceNew: " + totalPriceNew);

            const prodId = event.currentTarget.dataset.id;
            const prodIndex = this.productlistCopy.findIndex(item => item.id === prodId);
            const prod = this.productlistCopy[prodIndex];

            let subTotal = Number(prod.subTotal);
            let totalPriceOld = Number(prod.totalPrice);

            // If not been changed the totalprice or subtotal has not just been calculated
            if(totalPriceOld === totalPriceNew || !subTotal) return;

            this.dispatchSpinnerEvent(true);

            // Validation
            if(totalPriceNew >= subTotal) {
                //prod.unitPrice = (totalPriceNew / prod.quantity);
                prod.salesDiscount = 0.0;
                prod.ppu = totalPriceNew / prod.quantity;
                prod.totalPrice = totalPriceNew;

                if(this.recordid.startsWith("0Q0")) {
                    prod.unitPrice = totalPriceNew / prod.quantity;
                }
            }
            else {
                // Calculation..
                const discountCalculated = ((1) - (totalPriceNew / subTotal));
                console.log("discountCalculated: " + discountCalculated);
    
                // Second Validation
                const expectedDiff = (subTotal - totalPriceNew).toFixed(6);
                const realDiff = subTotal * discountCalculated;

                if(expectedDiff != realDiff)
                    prod.unitPrice = (totalPriceNew / (prod.quantity * (1 - discountCalculated)));
    
                // Assignments..
                prod.salesDiscount = discountCalculated * 100;
                prod.totalPrice = totalPriceNew;
                prod.ppu = totalPriceNew / prod.quantity;
            }

            this.productlistCopy.splice(prodIndex, 1, prod);
            this.calculateFeeValues();
            this.dispatchSpinnerEvent(false);
        } catch (error) {
            console.log("catch.onblurTotalPrice" + error);
        }
    }

    calculateFeeValues() {
        this.discountRatio = 0;
        this.totalEstimatedGross = 0;
        let totalSubFee = 0.00;
        let totalSalesFee = 0.00;
        let totalCost = 0.00;
        
        for (let prod of this.productlistCopy) {
            if(this.checkIsExceptionalCalculation(prod.feeType)) continue;
            
            if (prod.subTotal) {
                totalSubFee += Number(prod.subTotal);
            }
            if (prod.totalPrice) {
                totalSalesFee += Number(prod.totalPrice);
            }
            if (prod.estimatedCostTotal) {
                totalCost += Number(prod.estimatedCostTotal);
            }
        }
        this.totalCost = totalCost > 0 ? totalCost.toFixed(6) : 0;
        this.totalListFee = totalSubFee > 0 ? totalSubFee.toFixed(6) : 0;
        this.totalSalesListFee = totalSalesFee > 0 ? totalSalesFee.toFixed(6) : 0;

        if (totalSubFee > 0 && totalSalesFee > 0) {
            let floatRatioDiscount = ((1 - (this.totalSalesListFee / this.totalListFee)) * 100);
            let strRatioDiscount = floatRatioDiscount.toString();
            let indexOfPointDiscount = strRatioDiscount.indexOf(".");
        
            if(indexOfPointDiscount != -1) {
                this.discountRatio = strRatioDiscount.substring(0, (indexOfPointDiscount + 3));
            } else {
                this.discountRatio = floatRatioDiscount.toFixed(6);
            }
        
            let floatRatioGross = (((this.totalSalesListFee - this.totalCost) / this.totalSalesListFee) * 100);
            let strRatioGross = floatRatioGross.toString();
            let indexOfPointGross = strRatioGross.indexOf(".");
        
            if(indexOfPointGross != -1) {
                this.totalEstimatedGross = strRatioGross.substring(0, (indexOfPointGross + 3));
            } else {
                this.totalEstimatedGross = floatRatioGross.toFixed(6);
            }
        }
        
    }

    checkForICP(record) {
        const acqType = record.Acquisition_Type__c;
        const acqSubType = record.AcquisitionSubType__c;

        return (acqType == "New Acquisition" && acqSubType == "New Sales - New Domain")
               || (acqType == "Upsell" && acqSubType == "Upsell - Additional Domain")
    }

    checkFieldValidation() {
        return this.productlistCopy.every(product => product.period);
    }

    checkValidity() {
        let periodElements = this.template.querySelectorAll('[data-prop="limitationPeriod"]');
        periodElements.forEach(data => data.reportValidity());
    }

    preSaveAction() {
        // Form validation
        if(!this.checkFieldValidation()) {
            this.checkValidity();
            this.showToast("Error", "Please fill the all Limitation Periods", "error");
            return;
        }

        // Non-ICP Check
        const hasNonIcpProducts = this.productlistCopy.filter(item => item.icpCheck);
        
        if(hasNonIcpProducts.length > 0 && this.checkForICP(this.record)) {
            const vertical = this.record.Account.Vertical__c;
            const industry = this.record.Account.Industry;
            const nonIcpIndustry = this.record.Account.NON_ICP_Industry__c;

            if(nonIcpIndustry) {
                this.showGetReasonPopup = true;
                this.industryTypeError = true;
            }
            else {
                this.dispatchSpinnerEvent(true);
                
                searchMtuLimit({vertical, industry})
                .then(data => {
                    if(data.length == 0) {
                        this.onclickSave();
                        return;
                    }

                    const mtuLimit = data[0].Minimum_MTU_Limit__c;
                    this.lessThanLimitProducts = hasNonIcpProducts.filter(item => item.quantity < mtuLimit);

                    if(this.lessThanLimitProducts.length > 0) {
                        this.showGetReasonPopup = true;
                        this.productLimitError = true;
                    }
                    else this.onclickSave();
                })
                .catch(error => {
                    this.showToast("Error", error.body.message, "error");
                })
                .finally (() => {
                    this.dispatchSpinnerEvent(false);
                })
            }
        }
        else this.onclickSave();
    }

    onclickSave() {
        try {
            this.dispatchSpinnerEvent(true);

            let lineItemList = [];
            for (let prod of this.productlistCopy) {
                if (!prod.quantity) continue;

                lineItemList.push(this.convertToLineItem(prod));
            }

            // Call apex to create Opportunity / Quote Line Items
            if (lineItemList.length > 0 || this.deletedLineItems.length > 0) {
                
                // Opportunity
                if (this.recordid.startsWith("006")) {
                    createLines({ lines: JSON.stringify(lineItemList), deletedLines: JSON.stringify(this.deletedLineItems )})
                        .then(() => {
                            this.dispatchSpinnerEvent(false);
                            this.showToast("Success", lineItemList.length + " Line(s) was created successfully!", "success");
                            eval("$A.get('e.force:refreshView').fire();");
                            this.closeComponent();
                        })
                        .catch(error => {
                            this.dispatchSpinnerEvent(false);
                            
                            this.showToast("Error", error.body.message, "error");
                        });
                }
                // Quote 
                else {
                    console.log(JSON.stringify(lineItemList));
                    saveQuoteLines({ lines: JSON.stringify(lineItemList), deletedLines: JSON.stringify(this.deletedLineItems )})
                        .then(() => {
                            this.dispatchSpinnerEvent(false);
                            this.showToast("Success", lineItemList.length + " Line(s) was created successfully!", "success");
                            eval("$A.get('e.force:refreshView').fire();");
                            this.closeComponent();
                        })
                        .catch(error => {
                            this.dispatchSpinnerEvent(false);
                            let message = error.body?.message;
                            let messageBody = message?.split("EXCEPTION,")[1];

                            this.showToast("Error", messageBody ? messageBody : error.body.message, "error");
                        });

                }
            } else {
                this.dispatchSpinnerEvent(false);
                this.showToast("Error", "Please select product with valid quantity!", "warning");
            }
        } catch (error) {
            console.log(error);
            console.log("catch.onclickSave" + JSON.stringify(error));
        }
    }

    onclickCancel() {
        this.closeComponent();
    }

    checkIsExceptionalCalculation(feeType) {
        return ["Flex Fee"].includes(feeType);
    }

    checkIsAnnualShortCodeFee(feeType) {
        return (feeType == "Annual Short Code Fee");
    }

    convertToLineItem(product) {
        const isExp = this.checkIsExceptionalCalculation(product.feeType);
        console.log("ListPrice: product.listPrice ",product.listPrice)
        console.log("ListPrice: product.EstimatedCost__c ",product.estimatedCost)


        let lineItem = {
            Id: product.lineId,
            Product2Id: product.id,
            Quantity: product.quantity,
            AutoDiscount__c: product.autoDiscountRate,
            DiscountedPrice__c: Number(product.discountedPrice)?.toFixed(4).replaceAll(",", "."),
            Discount: isExp ? 100 : product.salesDiscount,
            //UnitPrice: product.unitPrice, //product.listPrice * (1 - product.autoDiscountRate/100),
            ListPrice: product.listPrice,
            EstimatedCost__c: product.estimatedCost,
            PPU__c: product.ppu,
            PricebookEntryId: product.pbeId,
            LimitationPeriod__c: product.period,
            Subtotal: product.subTotal
        };

        if (this.recordid.startsWith("006")) lineItem.OpportunityId = this.recordid;
        else {
            lineItem.QuoteId = this.recordid;
            lineItem.UnitPrice = product.unitPrice;
            lineItem.Subtotal = null;
        }

        if(isExp) {
            lineItem.FlexFeeTotal__c = product.totalPrice;
            lineItem.FlexFeeDiscount__c = product.salesDiscount;
            lineItem.UnitPrice = product.totalPrice;
        }
        else lineItem.TotalPrice = product.totalPrice;

        return lineItem;
    }

    onchangeLimitation(event) {
        const prodId = event.currentTarget.dataset.id;

        const index = this.productlistCopy.findIndex(item => item.id === prodId);
        const lineItem = this.productlistCopy[index];

        lineItem.period = event.detail.value;
    }

    onclickDelete(event) {
        const prodId = event.currentTarget?.dataset?.id;
        const deletedIndex = this.productlistCopy.findIndex(item => item.id === prodId);
        const deletedItems = this.productlistCopy.splice(deletedIndex, 1);
        if (deletedItems[0].lineId) this.deletedLineItems.push({ Id: deletedItems[0].lineId });
        this.calculateFeeValues();
    }

    onclickPrevious() {
        const selectedProdOnPreviousPage = this.productlistCopy.filter(item => !item.lineId);
        this.dispatchEvent(new CustomEvent("previousevent", { detail: selectedProdOnPreviousPage }));
    }

    dispatchSpinnerEvent(status) {
        this.dispatchEvent(new CustomEvent("spinnerevent", { detail: status }));
    }

    closeComponent() {
        this.dispatchEvent(new CustomEvent("closescreen"));
    }

    showToast(title, message, variant, mode = (variant === "error" ? "sticky" : "")) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant,
            mode
        }));
    }

    // Methods for Modal
    closeModal() {
        this.showGetReasonPopup = false;
        this.productLimitError = false;
        this.industryTypeError = false;
    }

    submitReason() {
        this.dispatchSpinnerEvent(true);
        const form = this.template.querySelector("lightning-record-edit-form");
        form.submit();
    }

    handleSuccess() {
        this.closeModal();
        this.onclickSave();
    }

    handleError(event) {
        this.dispatchSpinnerEvent(false);
        console.log("error" + JSON.stringify(event));
    }
}