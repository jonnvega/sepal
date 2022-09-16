package component.budget

import org.openforis.sepal.component.budget.api.Budget
import org.openforis.sepal.component.budget.event.UserInstanceBudgetExceeded
import org.openforis.sepal.component.budget.event.UserStorageSpendingExceeded

class CheckUserInstanceSpending_Test extends AbstractBudgetTest {

    def 'Given spending exceeding budget, when checking instance usage, instance usage is exceeded'() {
        updateUserBudget(createBudget(instanceSpending: 100))
        session(start: '2016-01-01', hours: 1, hourlyCost: 101)

        when:
        def spending = checkUserInstanceSpending()

        then:
        def event = published UserInstanceBudgetExceeded
        event.userInstanceSpending == spending
        spending.spending == 101
        spending.budget == 100
    }

    def 'Given spending same as budget, when checking instance usage, instance usage is exceeded'() {
        updateUserBudget(createBudget(instanceSpending: 100))
        session(start: '2016-01-01', hours: 1, hourlyCost: 100)

        when:
        def spending = checkUserInstanceSpending()

        then:
        def event = published UserInstanceBudgetExceeded
        spending.spending == 100
        spending.budget == 100
    }

    def 'Given no usage, when checking instance usage, instance usage is not exceeded'() {
        when:
        def spending = checkUserInstanceSpending()

        then:
        events.isEmpty()
        spending.spending == 0
        spending.budget == defaultBudget.instanceSpending
    }
}
