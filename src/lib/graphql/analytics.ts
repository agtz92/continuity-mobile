import { gql } from "@apollo/client";

export const ANALYTICS_QUERY = gql`
  query Analytics($range: AnalyticsRange!) {
    analytics(range: $range) {
      range
      rangeStart
      rangeEnd
      cadence {
        activeDaysInRange
        totalActivityEvents
      }
      activitySeries {
        day
        updates
        completedTasks
        totalEvents
      }
      weekdayHeatmap {
        weekday
        count
      }
      topProjects {
        projectId
        name
        status
        interactions
        deltaVsPrev
      }
      statusCounts {
        status
        count
      }
      categoryBreakdown {
        categoryId
        name
        color
        projectCount
        interactions
      }
      backlog {
        overdueTasks
        dueSoonTasks
        openTasks
        quickWins
        almostThere
      }
      sleepingProjects {
        projectId
        name
        daysIdle
        bucket
      }
      staleIdeas {
        ideaId
        title
        daysOld
      }
      ideaFunnel {
        ideasCreated
        ideasPromoted
        promotionRate
      }
      effort {
        effortHoursTotal
        tasksWithEffortPct
        effortHoursByProject {
          projectId
          name
          hours
        }
      }
      loop {
        messagesSent
        messagesDeltaVsPrev
        conversations
        actionsTaken
        activeDays
        deepMessages
        connectorInteractions
        daily {
          day
          messages
          deepMessages
        }
        topTools {
          tool
          count
        }
      }
    }
  }
`;

// ===== Perfil / onboarding / layout del Today =====
