//SF-300
trigger AccountTrigger on Account(before insert, before update, after update) {
  if (Trigger.isBefore) {
    if (Trigger.isInsert) {
      AccountHandler.validateUniqueAccountName(Trigger.new);
    } else if (Trigger.isUpdate) {
      AccountHandler.applyAccountFieldRules(Trigger.new, Trigger.oldMap);
      AccountHandler.enforceUniqueNamingBeforeUpdate(Trigger.new, Trigger.oldMap);
    }
  } else if (Trigger.isAfter && Trigger.isUpdate) {
    AccountHandler.notifySlackOnAccountUpdate(Trigger.new, Trigger.oldMap);
    AccountHandler.syncAgreementContactsWithAccount(
      Trigger.new,
      Trigger.oldMap
    );
  }
}