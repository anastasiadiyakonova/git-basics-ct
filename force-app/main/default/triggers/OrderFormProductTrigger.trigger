trigger OrderFormProductTrigger on OrderFormProduct__c (after insert, after update, after delete, before insert, before update) {
    if(Trigger.isAfter) {        
        Set<Id> orderFormIds = new Set<Id>();        
        for (OrderFormProduct__c product : Trigger.isDelete ? Trigger.old : Trigger.new) {
            if(product.OrderFormTypeFormula__c == 'Main Order' && product.FeeType__c != 'Flex Fee') {
                orderFormIds.add(product.OrderForm__c);
            }
        }        
        Map<Id, OrderForm__c> orderForms = new Map<Id, OrderForm__c>([
            SELECT Id, ProductInfo__c
            FROM OrderForm__c
            WHERE Id IN :orderFormIds AND OrderFormType__c = 'Main Order'
        ]);        
        if (!Trigger.isDelete) {
            for (OrderFormProduct__c product : Trigger.new) {
                OrderForm__c orderForm = orderForms.get(product.OrderForm__c);
                if (orderForm != null && product.ProductFamilyFormula__c != null) {
                    if (orderForm.ProductInfo__c == null)  orderForm.ProductInfo__c = '';
                    if (!orderForm.ProductInfo__c.contains(product.ProductFamilyFormula__c + ';')) orderForm.ProductInfo__c += product.ProductFamilyFormula__c + ';';
                 }
            }
        }
        if (Trigger.isDelete ) {
            for (OrderFormProduct__c product : Trigger.old) {
                OrderForm__c orderForm = orderForms.get(product.OrderForm__c);
                if (orderForm != null && product.ProductFamilyFormula__c != null) {
                    String toRemove = product.ProductFamilyFormula__c + ';';
                    if (orderForm.ProductInfo__c != null && orderForm.ProductInfo__c.contains(toRemove)) orderForm.ProductInfo__c = orderForm.ProductInfo__c.replace(toRemove, '');
                }
            }
        }        
        update orderForms.values();        
    }
}