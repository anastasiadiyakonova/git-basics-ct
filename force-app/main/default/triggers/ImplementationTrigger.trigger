trigger ImplementationTrigger on Implementations__c (before delete) {
    Profile sysAdminProfile = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];
    for (Implementations__c impl : Trigger.old) {
        if (UserInfo.getProfileId() != sysAdminProfile.Id) {
            impl.addError('You do not have permission to delete this record.');
        }
    }
}