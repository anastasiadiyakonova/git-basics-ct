trigger QuoteTrigger on Quote (before update, after update, before insert) {
    if(Trigger.isAfter) {
        Map<Id, Quote> oldQuotesMap = Trigger.oldMap;
        List<SObject> recordsToProcessConfirmed = new List<SObject>();
        List<SObject> recordsToProcessRejected = new List<SObject>();
        List<SObject> recordsToProcessConfirmedExpired = new List<SObject>();
        Map<SObject, String> territories = new Map<SObject, String>();
        for (Quote record : Trigger.new) {
            Quote oldRecord = oldQuotesMap.get(record.Id);
            if (record.Status == 'Confirmed' && record.Status != oldRecord.Status) {
                recordsToProcessConfirmed.add(record);
                territories.put(record, record.Territory__c);
            }
            if (record.Status == 'Rejected' && record.Status != oldRecord.Status) {
                recordsToProcessRejected.add(record);
                territories.put(record, record.Territory__c);
            }
            if (record.Status == 'Confirmed Expired' && record.Status != oldRecord.Status) {
                recordsToProcessConfirmedExpired.add(record);
                territories.put(record, record.Territory__c);
            }
        }
        if (!recordsToProcessConfirmed.isEmpty()) {
            SlackNotification.sendApprovedMessages(recordsToProcessConfirmed, 'QuoteConfirmation', territories);
        }
        if (!recordsToProcessRejected.isEmpty()) {          
            SlackNotification.sendApprovedMessages(recordsToProcessRejected, 'QuoteRejection', territories);
        }
        if (!recordsToProcessConfirmedExpired.isEmpty()) {
            SlackNotification.sendApprovedMessages(recordsToProcessConfirmedExpired, 'QuoteConfirmedExpired', territories);
        }
    }
    
    if(Trigger.isBefore) {
        
        List<String> errorMessages = new List<String>();
        
        for (Quote q : Trigger.new) {
            if(!Trigger.isInsert) {
                
                
                Quote oldQuote = Trigger.oldMap.get(q.Id);
                if (q.Status == 'Confirmed'  && oldQuote.Status != 'Confirmed') {
                    q.Confirmed_Date__c = Date.Today();
                    Date expiryDate = Date.newInstance(q.Confirmed_Date__c.year(), q.Confirmed_Date__c.month(), q.Confirmed_Date__c.day());
                    Integer month = expiryDate.month();
                    Integer year = expiryDate.year();
                    
                    if (month <= 3) {
                        expiryDate = Date.newInstance(year, 3, 31);
                    } else if (month <= 6) {
                        expiryDate = Date.newInstance(year, 6, 30);
                    } else if (month <= 9) {
                        expiryDate = Date.newInstance(year, 9, 30);
                    } else {
                        expiryDate = Date.newInstance(year, 12, 31);
                    }
                    q.ExpirationDate = expiryDate;
                }
                if (q.Status == 'Rejected' && oldQuote.Status != 'Rejected') {
                    q.RejectedDate__c = Date.Today();
                }
                if (q.Status == 'Confirmed Expired' && oldQuote.Status != 'Confirmed Expired' && !System.isBatch()) {
                    errorMessages.add('You cannot manually update the status to "Confirmed Expired".');
                }
                if (q.Status == 'Request an Approval' && oldQuote.Status != 'Request an Approval') {
                    q.RequestPriceReviewDate__c = Date.Today();
                }
            }
            if (q.Status == 'Request an Approval' && Trigger.isInsert) {
                q.RequestPriceReviewDate__c = Date.Today();
            }
        }
        
        if (!errorMessages.isEmpty()) {
            for (String errorMessage : errorMessages) {
                Trigger.new[0].addError(errorMessage);
            }
        }
    }
    
}