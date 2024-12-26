trigger InOneTrigger on InOne__c (before insert, before update) {
    
    String errorMessage = System.Label.SM_Duplicate_Value_Found;
    
    if(trigger.isBefore && trigger.isInsert)
    {
        List<String> inOneNameList = new List<String>();
        
        List<Account> AccountList = new List<Account>();
        
        for(InOne__c inOne : trigger.new)
        {
            inOneNameList.add(inOne.Name);            
        }
        
        AccountList = [SELECT Name FROM Account WHERE Name in: inOneNameList];
        
        if(AccountList.size() > 0) {
            Trigger.New[0].addError(errorMessage);
        }
        
    }
    
    if(trigger.isBefore && trigger.isUpdate)
    {
        List<String> inOneNameList = new List<String>();
        
        List<Account> AccountList = new List<Account>();
        
        for(InOne__c inOne : trigger.new)
        {
            InOne__c oldInOne = Trigger.oldMap.get(inOne.ID);
            
            if(inOne.Name != oldInOne.Name){
                inOneNameList.add(inOne.Name);  
            }              
        }
        
        AccountList = [SELECT Name FROM Account WHERE Name in: inOneNameList];
        
        if(AccountList.size() > 0) {
            Trigger.New[0].addError(errorMessage);
        }
        
    }
}