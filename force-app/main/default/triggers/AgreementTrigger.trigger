trigger AgreementTrigger on Agreement__c(
  before insert,
  after insert,
  after update
) {
  if (Trigger.isAfter) {
    if (Trigger.isInsert) {
      AgreementHandler.updateCustomer(Trigger.new, null);
    } else if (Trigger.isUpdate) { AgreementHandler.updateCustomer(Trigger.new, Trigger.oldMap);
    }
  } else if (Trigger.isBefore && Trigger.isInsert) {
    AgreementHandler.checkInvoiceContactId(Trigger.new);
  }
}