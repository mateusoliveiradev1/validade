# UAT Debug: refresh feedback

## Symptom

During UAT test 3, tapping "Atualizar tarefas" was perceived as doing nothing.

## Root Cause

`TodayScreen.refreshTasks` only gives transient feedback during the promise by changing the button label to "Atualizando tarefas". On a fast successful refresh with unchanged task data, the screen returns to the exact same visual state and does not leave a persistent success, refreshed-at, or "no changes" notice. The button also remains visually the same apart from text, so the user can reasonably perceive the action as inert.

## Evidence

- `apps/mobile/src/capture/TodayScreen.tsx` stores `isRefreshing` and swaps the secondary action label while loading.
- The success path updates `tasks` and `futureAttention`, but does not set any success feedback state.
- Existing tests cover failure recovery and the transient refreshing label, but not user-visible success confirmation after manual refresh.

## Suggested Fix Direction

Add lightweight manual-refresh feedback, such as "Tarefas atualizadas agora" or "Nenhuma nova tarefa", persist it long enough to be seen, and cover it with a focused TodayScreen test. Consider disabling duplicate refresh taps while `isRefreshing` is true.
