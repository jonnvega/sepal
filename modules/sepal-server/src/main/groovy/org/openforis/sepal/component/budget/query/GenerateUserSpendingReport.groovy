package org.openforis.sepal.component.budget.query

import groovy.transform.Immutable
import org.openforis.sepal.component.budget.api.BudgetRepository
import org.openforis.sepal.component.budget.api.UserSpendingReport
import org.openforis.sepal.component.budget.internal.InstanceSpendingService
import org.openforis.sepal.component.budget.internal.StorageUseService
import org.openforis.sepal.query.Query
import org.openforis.sepal.query.QueryHandler

@Immutable
class GenerateUserSpendingReport implements Query<UserSpendingReport> {
    String username
}

class GenerateUserSpendingReportHandler implements QueryHandler<UserSpendingReport, GenerateUserSpendingReport> {
    private final InstanceSpendingService instanceSpendingService
    private final StorageUseService storageUseService
    private final BudgetRepository budgetRepository

    GenerateUserSpendingReportHandler(
            InstanceSpendingService instanceSpendingService,
            StorageUseService storageUseService,
            BudgetRepository budgetRepository) {
        this.instanceSpendingService = instanceSpendingService
        this.storageUseService = storageUseService
        this.budgetRepository = budgetRepository
    }

    UserSpendingReport execute(GenerateUserSpendingReport query) {
        def username = query.username
        double instanceSpending = instanceSpendingService.instanceSpending(username)
        def storageUse = storageUseService.storageUseForThisMonth(username)
        double storageSpending = storageUseService.calculateSpending(storageUse)
        double costPerGbMonth = storageUseService.costPerGbMonth()
        def budget = budgetRepository.userBudget(username)
        def budgetUpdateRequest = budgetRepository.budgetUpdateRequest(username)
        new UserSpendingReport(
                username: username,
                instanceSpending: instanceSpending,
                storageSpending: storageSpending,
                storageUsage: storageUse.gb,
                instanceBudget: budget.instanceSpending,
                storageBudget: budget.storageSpending,
                storageQuota: budget.storageQuota,
                costPerGbMonth: costPerGbMonth,
                budgetUpdateRequest: budgetUpdateRequest
        )
    }
}
