trigger LegalInformationTrigger on LegalInformation__c (before insert, before update) {
    if (Trigger.isBefore) {
        if (Trigger.isInsert) {
            LegalInformationHandler.updateAccountName(Trigger.new, null);
            LegalInformationHandler.populateLegalInfoName(Trigger.new, null);
        } else if (Trigger.isUpdate) {
            LegalInformationHandler.updateAccountName(Trigger.new, Trigger.oldMap);
            LegalInformationHandler.populateLegalInfoName(Trigger.new, Trigger.oldMap);
        }
    }
}