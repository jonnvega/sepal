package component.budget

import org.openforis.sepal.component.budget.api.Budget

class FindUsersExceedingBudget_Test extends AbstractBudgetTest {
    def setup() {
        userRepository.eachUsername(_) >> { it[0].call(testUsername) }
    }

    def 'Given a user not exceeding budget, when submitting query, no user is returned'() {
        notExceedingBudget()

        expect:
        findUsersExceedingBudget().empty
    }

    def 'Given a user exceeding instance budget, when submitting query, user is returned'() {
        exceedingInstanceBudget()

        expect:
        findUsersExceedingBudget().toSet() == [testUsername].toSet()
    }

    def 'Given a user exceeding storage budget, when submitting query, user is returned'() {
        exceedingStorageBudget()

        expect:
        findUsersExceedingBudget().toSet() == [testUsername].toSet()
    }


    def 'Given a user exceeding storage quota, when submitting query, user is returned'() {
        exceedingStorageQuota()

        expect:
        findUsersExceedingBudget().toSet() == [testUsername].toSet()
    }

    void exceedingInstanceBudget() {
        updateDefaultBudget(createBudget(instanceSpending: 1, storageSpending: 9999, storageQuota: 9999))
        session(start: '2016-01-01', hours: 9999, hourlyCost: 9999)
    }

    void exceedingStorageBudget() {
        updateDefaultBudget(createBudget(storageSpending: 1, storageQuota: 9999))
        storageCost(9999)
        storage(gb: 1, days: 9999)
    }

    void exceedingStorageQuota() {
        updateDefaultBudget(createBudget(storageSpending: 9999, storageQuota: 1))
        storageCost(1)
        storage(gb: 9999, days: 1)
    }

    void notExceedingBudget() {
        updateDefaultBudget(createBudget(instanceSpending: 9999, storageSpending: 9999, storageQuota: 9999))
        session(start: '2016-01-01', hours: 1, hourlyCost: 1)
    }
}
