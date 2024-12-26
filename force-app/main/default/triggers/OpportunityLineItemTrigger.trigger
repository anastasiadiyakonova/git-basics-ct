trigger OpportunityLineItemTrigger on OpportunityLineItem(
  after insert,
  after update,
  after delete
) {
  if (Trigger.isAfter) {
    if (Trigger.isInsert) {
      OpportunityLineItemHandler.updateConvertedUSD(Trigger.new, null);
    } else if (Trigger.isUpdate) {
      OpportunityLineItemHandler.updateConvertedUSD(
        Trigger.new,
        Trigger.oldMap
      );
    } else if (Trigger.isDelete) {
      OpportunityLineItemHandler.updateConvertedUSD(null, Trigger.oldmap);
    }
  }
}