trigger ContactTrigger on Contact (after Update) {   
    /*if(Trigger.isAfter && Trigger.isUpdate){
        List <Contact> conList = new List<Contact>();
        for(Contact conObj : Trigger.new){
            System.debug(conObj.Approval_status__c);
            if(Trigger.oldMap.get(conObj.id).Approval_status__c != conObj.Approval_status__c && conObj.Approval_status__c == 'Approved'){
                 conList.add(conObj);
              }
        }
        CreateUser.creatingUser(conList);
       
    }*/

}