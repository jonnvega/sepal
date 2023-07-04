package org.openforis.sepal.component.budget.command

import groovy.transform.Canonical
import groovy.transform.EqualsAndHashCode
import org.openforis.sepal.command.AbstractCommand
import org.openforis.sepal.command.CommandHandler
import org.openforis.sepal.component.budget.api.BudgetRepository
import org.openforis.sepal.component.budget.api.UserStorageUse
import org.openforis.sepal.component.budget.event.UserStorageQuotaExceeded
import org.openforis.sepal.component.budget.event.UserStorageSpendingExceeded
import org.openforis.sepal.component.budget.internal.StorageUseService
import org.openforis.sepal.event.EventDispatcher

@EqualsAndHashCode(callSuper = true)
@Canonical
class CheckUserStorageUse extends AbstractCommand<UserStorageUse> {
}

class CheckUserStorageUseHandler implements CommandHandler<UserStorageUse, CheckUserStorageUse> {
    private final StorageUseService storageUseService
    private final BudgetRepository budgetRepository
    private final EventDispatcher eventDispatcher

    CheckUserStorageUseHandler(
            StorageUseService storageUseService,
            BudgetRepository budgetRepository,
            EventDispatcher eventDispatcher) {
        this.storageUseService = storageUseService
        this.budgetRepository = budgetRepository
        this.eventDispatcher = eventDispatcher
    }

    @SuppressWarnings("GroovyConditionalWithIdenticalBranches")
    UserStorageUse execute(CheckUserStorageUse command) {
        def storageUse = storageUseService.storageUseForThisMonth(command.username)
        def spending = storageUseService.calculateSpending(storageUse)
        def budget = budgetRepository.userBudget(command.username)
        def userStorageUse = new UserStorageUse(
                username: command.username,
                spending: spending,
                use: storageUse.gb,
                budget: budget.storageSpending,
                quota: budget.storageQuota
        )
        if (spending >= budget.storageSpending)
            eventDispatcher.publish(new UserStorageSpendingExceeded(userStorageUse))
        if (storageUse.gb >= budget.storageQuota)
            eventDispatcher.publish(new UserStorageQuotaExceeded(userStorageUse))

        return userStorageUse
    }
}
