trigger OpportunityTrigger on Opportunity (after update, after insert, before update, before insert) {
    if (Trigger.isUpdate) {
        if (Trigger.isAfter) {
            Map<SObject,String> territoriesRecordsPocApproved 
                = new Map<SObject,String>();
            List<SObject> recordsPocApproved 
                = new List<SObject>();
            Map<SObject,String> territoriesRecordsPocRejected 
                = new Map<SObject,String>();
            List<SObject> recordsPocRejected 
                = new List<SObject>();
            Map<SObject,String> territoriesRecordsPocExtensionApproved 
                = new Map<SObject,String>();
            List<SObject> recordsPocExtensionApproved 
                = new List<SObject>();
            Map<SObject,String> territoriesRecordsPocExtensionRejected 
                = new Map<SObject,String>();
            List<SObject> recordsPocExtensionRejected 
                = new List<SObject>();
            List<Opportunity> newRecords 
                = new List<Opportunity>();
            List<Opportunity> oldRecords 
                = new List<Opportunity>();
            Set<Id> opportunityIdsToCheck 
                = new Set<Id>();
            for (Opportunity opp : Trigger.new) {
                Opportunity oldOpp = Trigger.oldMap.get(opp.Id);
                if ((opp.StageName=='Approved' && oldOpp.StageName=='Approved') || (opp.StageName=='Closed Won' && oldOpp.StageName=='Closed Won')) {
                    newRecords.add(opp); oldRecords.add(oldOpp);
                }
                if (opp.POCRequestStatus__c=='POC Requested' && oldOpp.POCRequestStatus__c!='POC Requested') {submitForApproval(opp,'POC_Approval','Submitted for POC Approval','OppPOCRequestAproval');
                }
                if (opp.POCExtensionRequestStatus__c=='POC Extension Requested' && oldOpp.POCExtensionRequestStatus__c!='POC Extension Requested') {submitForApproval(opp,'POC_Extension_Approval','Submitted for POC Extension Approval','OppPOCExtensionRequestAproval');
                }
                if (opp.POCExtensionRequestStatus__c=='POC Extension Approved' && oldOpp.POCExtensionRequestStatus__c!='POC Extension Approved') {opportunityIdsToCheck.add(opp.Id);
                }
                if (opp.POCRequestStatus__c=='POC Approved' && oldOpp.POCRequestStatus__c!='POC Approved') {  recordsPocApproved.add(opp); territoriesRecordsPocApproved.put(opp, opp.Territory__c);
                }
                if (opp.POCRequestStatus__c=='POC Rejected' && oldOpp.POCRequestStatus__c!='POC Rejected') {  recordsPocRejected.add(opp); territoriesRecordsPocRejected.put(opp, opp.Territory__c);
                }
                if (opp.POCExtensionRequestStatus__c=='POC Extension Approved' && oldOpp.POCExtensionRequestStatus__c!='POC Extension Approved') {    recordsPocExtensionApproved.add(opp); territoriesRecordsPocExtensionApproved.put(opp, opp.Territory__c);
                }
                if (opp.POCExtensionRequestStatus__c=='POC Extension Rejected' && oldOpp.POCExtensionRequestStatus__c!='POC Extension Rejected') {   recordsPocExtensionRejected.add(opp); territoriesRecordsPocExtensionRejected.put(opp, opp.Territory__c);
                }
            }
            if (!newRecords.isEmpty()) {
                SlackChannel__mdt slackId = [SELECT Id, DeveloperName, SlackId__c FROM SlackChannel__mdt WHERE DeveloperName='salesforce_changelog'];
                SlackFieldChangeNotifier.notifyFieldChanges(oldRecords, newRecords, 'Opportunity', slackId.SlackId__c);
            }
            if (!recordsPocApproved.isEmpty())  SlackNotification.sendApprovedMessages(recordsPocApproved, 'OppPOCConfirmation', territoriesRecordsPocApproved);
            if (!recordsPocRejected.isEmpty())  SlackNotification.sendApprovedMessages(recordsPocRejected, 'OppPOCRejection', territoriesRecordsPocRejected);
            if (!recordsPocExtensionApproved.isEmpty())  SlackNotification.sendApprovedMessages(recordsPocExtensionApproved, 'OppPOCExtensionConfirmation', territoriesRecordsPocExtensionApproved);
            if (!recordsPocExtensionRejected.isEmpty())  SlackNotification.sendApprovedMessages(recordsPocExtensionRejected, 'OppPOCExtensionRejection', territoriesRecordsPocExtensionRejected);
            if (!opportunityIdsToCheck.isEmpty()) {
                List<Implementations__c> implementations = [SELECT Id, Opportunity__c, Customer_Onboarding_Manager__c FROM Implementations__c WHERE Opportunity__c IN :opportunityIdsToCheck];
                List<ChatterPostUtility.PostRequest> postRequests = new List<ChatterPostUtility.PostRequest>();
                for (Implementations__c impl : implementations) {
                    Opportunity opp = Trigger.newMap.get(impl.Opportunity__c);
                    postRequests.add(new ChatterPostUtility.PostRequest(impl.Id, 'POC Extension Approved. Please check new POC Extension End Date.', new List<Id>{impl.Customer_Onboarding_Manager__c}));
                }
                if (!postRequests.isEmpty() && !Test.isRunningTest()) { ChatterPostUtility.postToChatter(postRequests);
                }
            }
            OpportunityHandler.updateAccountStatus(Trigger.new, Trigger.oldMap);
        } else if (Trigger.isBefore) {
            OpportunityHandler.recalculateAmount(Trigger.new, Trigger.oldMap);
        }
    }
    if (Trigger.isInsert && Trigger.isAfter) {
        Id integrationUserId = '0058d000004UCWXAA4';
        List<OpportunityShare> oppShares = new List<OpportunityShare>();
        for (Opportunity opp : Trigger.new) {
            if (opp.OwnerId == integrationUserId && opp.AccountManager2__c != null) { oppShares.add(new OpportunityShare(OpportunityId=opp.Id, UserOrGroupId=opp.AccountManager2__c, OpportunityAccessLevel='Read', RowCause=Schema.OpportunityShare.RowCause.Manual));
            }
        }
        if (!oppShares.isEmpty()) Database.insert(oppShares);
    }
    if (Trigger.isUpdate && Trigger.isAfter) {
        Id integrationUserId = '0058d000004UCWXAA4';
        List<OpportunityShare> oppShares = new List<OpportunityShare>();
        for (Opportunity opp : Trigger.new) {
            Opportunity oldOpp = Trigger.oldMap.get(opp.Id);
            if (opp.OwnerId == integrationUserId && opp.AccountManager2__c != null && oldOpp.AccountManager2__c != opp.AccountManager2__c) {     oppShares.add(new OpportunityShare(OpportunityId=opp.Id, UserOrGroupId=opp.AccountManager2__c, OpportunityAccessLevel='Read', RowCause=Schema.OpportunityShare.RowCause.Manual));
            }
        }
        if (!oppShares.isEmpty()) Database.insert(oppShares);
    }
    if (Trigger.isBefore) {
        if (Trigger.isInsert) {
            OpportunityHandler.updateSalesOpsOwner(Trigger.new, null);
        } else if (Trigger.isUpdate) {
            OpportunityHandler.updateSalesOpsOwner(Trigger.new, Trigger.oldMap);
            OpportunityHandler.validateOpportunityAmounts(Trigger.new, Trigger.oldMap);
            OpportunityHandler.updateCloseDate(Trigger.new, Trigger.oldMap);
            OpportunityHandler.slippageTracker(Trigger.oldMap, Trigger.newMap);
            for (Opportunity opp : Trigger.new) {
                Opportunity oldOpp = Trigger.oldMap.get(opp.Id);
                if (oldOpp.isLocked__c && !opp.isLocked__c) opp.Lock__c = 2000;
                if (oldOpp.StageName != 'Closed Won' && opp.StageName == 'Closed Won') opp.Lock__c = 10;
                if (oldOpp.StageName != 'Approved' && opp.StageName == 'Approved') opp.Lock__c = 10;
            }
        }
    }
    private void submitForApproval(Opportunity opp, String approvalName, String approvalComment, String slackActionName) {
        Map<SObject,String> territories = new Map<SObject,String>();
        List<SObject> recordsPocRequest = new List<SObject>();
        Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
        req.setComments(approvalComment); req.setObjectId(opp.Id); req.setProcessDefinitionNameOrId(approvalName);
        Approval.ProcessResult result = Approval.process(req);
        if (result.isSuccess()) {
            recordsPocRequest.add(opp); territories.put(opp, opp.Territory__c);
            System.debug(recordsPocRequest);
            SlackNotification.sendApprovedMessages(recordsPocRequest, slackActionName, territories);
        } else {
            System.debug('Failed to submit for approval.');
        }
    }
}