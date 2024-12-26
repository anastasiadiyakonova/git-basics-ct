trigger OrderFormTrigger on OrderForm__c (after insert, after update, before insert, before update) {
    
    if (Trigger.isAfter && Trigger.isUpdate) {
        List<OrderForm__c> newRecords = new List<OrderForm__c>();
        List<OrderForm__c> oldRecords = new List<OrderForm__c>();
        for (OrderForm__c order : Trigger.new) {
            OrderForm__c oldOrder = Trigger.oldMap.get(order.Id);
            if ((order.OrderFormType__c == 'Main Order' || (order.Netsuite_Sales_Order_ID__c != null && oldOrder.Netsuite_Sales_Order_ID__c != null && order.OrderFormStatus__c != 'Backlog' && oldOrder.OrderFormStatus__c != 'Backlog'))) {
                newRecords.add(order);
                oldRecords.add(oldOrder);
            }
        }
        if (!newRecords.isEmpty()) { SlackChannel__mdt slackId = [SELECT ID,DeveloperName,SlackId__c from SlackChannel__mdt WHERE DeveloperName = 'salesforce_changelog'];
                                    
                                    SlackFieldChangeNotifier.notifyFieldChanges(oldRecords, newRecords, 'OrderForm__c' , slackId.SlackId__c);
                                   } 
    }
    if (Trigger.isBefore && Trigger.isUpdate) {
        for (OrderForm__c order : Trigger.new) {
            OrderForm__c oldOrder = Trigger.oldMap.get(order.Id);
            if (oldOrder.isLocked__c && !order.isLocked__c) { 
                order.Lock__c = 2000;
            }
            if (!order.isLocked__c && !oldOrder.isLocked__c && oldOrder.Netsuite_Sales_Order_ID__c == null && order.Netsuite_Sales_Order_ID__c != null && order.OrderFormStatus__c != 'Backlog') { 
                order.Lock__c = 10;
            }
            
        }
        
    }
    if (Trigger.isBefore && Trigger.isInsert) {
        for (OrderForm__c order : Trigger.new) {
            if (order.OrderFormType__c == 'Main Order') {
                order.Lock__c = 10;
            }
        }
    }
}