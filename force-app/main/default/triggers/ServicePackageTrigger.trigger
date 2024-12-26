trigger ServicePackageTrigger on ServicePackage__c (before insert, before update) {
    Id standardRecordTypeId = Schema.SObjectType.ServicePackage__c.getRecordTypeInfosByName().get('Standart').getRecordTypeId();
    
    for (ServicePackage__c sp : Trigger.new) {
        if (sp.RecordTypeId == standardRecordTypeId) {
            continue;
        }
        
        String packageName = '';
        
        packageName += isActiveService(sp.DevelopmentSupport__c) ? formatService('DS', sp.DevelopmentSupport__c) : '';
        packageName += isActiveService(sp.PlatformAdministration__c) ? formatService('PA', sp.PlatformAdministration__c) : '';
        packageName += isActiveService(sp.CheckInCalls__c) ? formatService('CC', sp.CheckInCalls__c) : '';
        packageName += isActiveService(sp.SupportHour__c) ? formatService('SH', sp.SupportHour__c) : '';
        packageName += isActiveService(sp.BusinessReviewMeeting__c) ? formatService('BRM', sp.BusinessReviewMeeting__c) : '';
        packageName += isActiveService(sp.OnboardingSupport__c) ? formatService('OS', sp.OnboardingSupport__c) : '';
        
        if (packageName.endsWith('_')) {
            packageName = packageName.substring(0, packageName.length() - 1);
        }
        
        sp.Name = 'Custom - ' + packageName;
        if (sp.Name.length() > 80) {
            sp.Name = sp.Name.substring(0, 80);
        }
    }
    
    String formatService(String abbreviation, String serviceValue) {
        String normalizedService = serviceValue.toLowerCase().replace(' hours', 'hr').replace(' hour', 'hr').replace(' / per ', '/').replace(' ', '');
        
        if (normalizedService.contains('hr/')) {
            return abbreviation + ':' + normalizedService.replace('hr/', 'Hr').replace('months', 'M').replace('month', 'M').replace('years', 'Y').replace('year', 'Y') + '_';
        } else if (normalizedService.contains('call/')) {
            return abbreviation + ':' + normalizedService.replace('call/', 'Cl').replace('calls/', 'Cl').replace('months', 'M').replace('month', 'M').replace('years', 'Y').replace('year', 'Y') + '_';
        } else if (normalizedService.contains('meeting/')) {
            return abbreviation + ':' + normalizedService.replace('meetings/', 'Mt').replace('meeting/', 'Mt').replace('years', 'Y').replace('year', 'Y') + '_';
        } else if (normalizedService.contains('hr')) {
            return abbreviation + ':' + normalizedService.replace('hrs', 'Hrs');
        }
        return '';
    }    
    Boolean isActiveService(String serviceValue) {
        return serviceValue != null && !serviceValue.toLowerCase().contains('no');
    }
}