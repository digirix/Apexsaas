import OpenAI from "openai";
import { db } from "../db.js";
import { tasks, taskStatuses, users, clients, entities, departments, aiConfigurations } from "../../shared/schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

export interface ReportInsight {
  type: 'success' | 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  metric?: string;
  value?: string | number;
}

export class AIReportInsightsService {
  private async getOpenAIClient(tenantId: number): Promise<OpenAI | null> {
    try {
      const aiConfig = await db
        .select()
        .from(aiConfigurations)
        .where(and(eq(aiConfigurations.tenantId, tenantId), eq(aiConfigurations.isActive, true)))
        .limit(1);

      if (!aiConfig[0]) {
        return null;
      }

      return new OpenAI({
        apiKey: aiConfig[0].apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });
    } catch (error) {
      console.error('Error getting OpenAI client:', error);
      return null;
    }
  }

  private async getTenantModel(tenantId: number): Promise<string> {
    try {
      const aiConfig = await db
        .select()
        .from(aiConfigurations)
        .where(and(eq(aiConfigurations.tenantId, tenantId), eq(aiConfigurations.isActive, true)))
        .limit(1);

      return aiConfig[0]?.model || "deepseek/deepseek-r1-0528-qwen3-8b:free";
    } catch (error) {
      return "deepseek/deepseek-r1-0528-qwen3-8b:free";
    }
  }

  async generateTaskPerformanceInsights(tenantId: number, filters: any = {}): Promise<ReportInsight[]> {
    try {
      const openai = await this.getOpenAIClient(tenantId);
      if (!openai) {
        return this.getFallbackInsights('task-performance');
      }

      // Gather task performance data
      const taskData = await this.getTaskPerformanceData(tenantId, filters);
      
      const prompt = `
        Analyze this task performance data for an accounting firm and provide 3-5 key insights with actionable recommendations.
        
        Data:
        - Total tasks: ${taskData.totalTasks}
        - Completed tasks: ${taskData.completedTasks}
        - Overdue tasks: ${taskData.overdueTasks}
        - Average completion time: ${taskData.avgCompletionTime} hours
        - Task completion rate: ${taskData.completionRate}%
        - Team performance by user: ${JSON.stringify(taskData.userPerformance)}
        - Task distribution by status: ${JSON.stringify(taskData.statusDistribution)}
        
        Focus on:
        1. Performance trends and bottlenecks
        2. Team efficiency patterns
        3. Risk areas requiring attention
        4. Opportunities for improvement
        
        Return insights as JSON array with this structure:
        {
          "insights": [
            {
              "type": "success|warning|critical|info",
              "title": "Brief insight title",
              "description": "Detailed explanation of the finding",
              "recommendation": "Specific actionable recommendation",
              "priority": "high|medium|low",
              "metric": "relevant metric name",
              "value": "metric value"
            }
          ]
        }
      `;

      const model = await this.getTenantModel(tenantId);
      
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specializing in accounting practice management analytics. Provide concise, actionable insights based on task performance data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
      return result.insights || [];
    } catch (error) {
      console.error('Error generating task performance insights:', error);
      return this.getFallbackInsights('task-performance');
    }
  }

  async generateComplianceInsights(tenantId: number, filters: any = {}): Promise<ReportInsight[]> {
    try {
      const openai = await this.getOpenAIClient(tenantId);
      if (!openai) {
        return this.getFallbackInsights('compliance');
      }

      const complianceData = await this.getComplianceData(tenantId, filters);
      
      const prompt = `
        Analyze this compliance data for an accounting firm and provide 3-5 key insights with actionable recommendations.
        
        Data:
        - Total compliance tasks: ${complianceData.totalTasks}
        - Upcoming deadlines (next 30 days): ${complianceData.upcomingDeadlines}
        - Overdue compliance items: ${complianceData.overdueItems}
        - Entities at risk: ${complianceData.entitiesAtRisk}
        - Compliance completion rate: ${complianceData.completionRate}%
        - Entity distribution: ${JSON.stringify(complianceData.entityDistribution)}
        - Jurisdiction risks: ${JSON.stringify(complianceData.jurisdictionRisks)}
        
        Focus on:
        1. Compliance deadline management
        2. Entity-specific risks
        3. Jurisdictional compliance patterns
        4. Resource allocation needs
        
        Return insights as JSON array with the specified structure.
      `;

      const model = await this.getTenantModel(tenantId);
      
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specializing in compliance management for accounting firms. Focus on regulatory deadlines and risk management."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
      return result.insights || [];
    } catch (error) {
      console.error('Error generating compliance insights:', error);
      return this.getFallbackInsights('compliance');
    }
  }

  async generateTeamEfficiencyInsights(tenantId: number, filters: any = {}): Promise<ReportInsight[]> {
    try {
      const openai = await this.getOpenAIClient(tenantId);
      if (!openai) {
        return this.getFallbackInsights('team-efficiency');
      }

      const teamData = await this.getTeamEfficiencyData(tenantId, filters);
      
      const prompt = `
        Analyze this team efficiency data for an accounting firm and provide 3-5 key insights with actionable recommendations.
        
        Data:
        - Total team members: ${teamData.totalMembers}
        - Average workload per member: ${teamData.avgWorkload} tasks
        - Team completion rate: ${teamData.teamCompletionRate}%
        - Department performance: ${JSON.stringify(teamData.departmentStats)}
        - Individual performance: ${JSON.stringify(teamData.individualStats)}
        - Workload distribution: ${JSON.stringify(teamData.workloadDistribution)}
        
        Focus on:
        1. Team productivity patterns
        2. Workload balance and distribution
        3. Individual vs team performance
        4. Department-specific insights
        
        Return insights as JSON array with the specified structure.
      `;

      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specializing in team management and productivity analysis for accounting firms."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
      return result.insights || [];
    } catch (error) {
      console.error('Error generating team efficiency insights:', error);
      return this.getFallbackInsights('team-efficiency');
    }
  }

  async generateRiskAssessmentInsights(tenantId: number, filters: any = {}): Promise<ReportInsight[]> {
    try {
      const riskData = await this.getRiskAssessmentData(tenantId, filters);
      
      const prompt = `
        Analyze this risk assessment data for an accounting firm and provide 3-5 key insights with actionable recommendations.
        
        Data:
        - High risk tasks: ${riskData.highRiskTasks}
        - Overdue critical items: ${riskData.overdueCritical}
        - Entities with multiple risks: ${riskData.multiRiskEntities}
        - Risk distribution: ${JSON.stringify(riskData.riskDistribution)}
        - Client risk profiles: ${JSON.stringify(riskData.clientRisks)}
        - Upcoming critical deadlines: ${riskData.criticalDeadlines}
        
        Focus on:
        1. Critical risk identification
        2. Client-specific risk patterns
        3. Preventive measures
        4. Risk mitigation strategies
        
        Return insights as JSON array with the specified structure.
      `;

      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specializing in risk management and compliance for accounting firms."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
      return result.insights || [];
    } catch (error) {
      console.error('Error generating risk assessment insights:', error);
      return this.getFallbackInsights('risk-assessment');
    }
  }

  private async getTaskPerformanceData(tenantId: number, filters: any) {
    const baseQuery = db
      .select({
        id: tasks.id,
        statusId: tasks.statusId,
        assigneeId: tasks.assigneeId,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
      })
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId));

    const allTasks = await baseQuery;
    
    const statusData = await db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.tenantId, tenantId));

    const userData = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const completedStatusIds = statusData
      .filter(s => s.name?.toLowerCase().includes('completed') || s.name?.toLowerCase().includes('done'))
      .map(s => s.id);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => completedStatusIds.includes(t.statusId)).length;
    const overdueTasks = allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && !completedStatusIds.includes(t.statusId)
    ).length;

    const completedTasksWithTime = allTasks.filter(t => 
      completedStatusIds.includes(t.statusId) && t.actualHours
    );
    
    const avgCompletionTime = completedTasksWithTime.length > 0 
      ? completedTasksWithTime.reduce((sum, t) => sum + (t.actualHours || 0), 0) / completedTasksWithTime.length
      : 0;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // User performance analysis
    const userPerformance = userData.map(user => {
      const userTasks = allTasks.filter(t => t.assigneeId === user.id);
      const userCompleted = userTasks.filter(t => completedStatusIds.includes(t.statusId));
      return {
        name: user.displayName,
        totalTasks: userTasks.length,
        completedTasks: userCompleted.length,
        completionRate: userTasks.length > 0 ? (userCompleted.length / userTasks.length) * 100 : 0
      };
    });

    // Status distribution
    const statusDistribution = statusData.map(status => {
      const count = allTasks.filter(t => t.statusId === status.id).length;
      return {
        status: status.name,
        count,
        percentage: totalTasks > 0 ? (count / totalTasks) * 100 : 0
      };
    });

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      userPerformance,
      statusDistribution
    };
  }

  private async getComplianceData(tenantId: number, filters: any) {
    const allTasks = await db
      .select({
        id: tasks.id,
        statusId: tasks.statusId,
        dueDate: tasks.dueDate,
        entityId: tasks.entityId,
        clientId: tasks.clientId,
        taskType: tasks.taskType,
      })
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId));

    const statusData = await db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.tenantId, tenantId));

    const entityData = await db
      .select()
      .from(entities)
      .where(eq(entities.tenantId, tenantId));

    const completedStatusIds = statusData
      .filter(s => s.name?.toLowerCase().includes('completed') || s.name?.toLowerCase().includes('done'))
      .map(s => s.id);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const totalTasks = allTasks.length;
    const upcomingDeadlines = allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= thirtyDaysFromNow
    ).length;
    
    const overdueItems = allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && !completedStatusIds.includes(t.statusId)
    ).length;

    const completedTasks = allTasks.filter(t => completedStatusIds.includes(t.statusId)).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const entitiesWithTasks = new Set(allTasks.map(t => t.entityId).filter(Boolean));
    const entitiesAtRisk = Array.from(entitiesWithTasks).filter(entityId => {
      const entityTasks = allTasks.filter(t => t.entityId === entityId);
      const entityOverdue = entityTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && !completedStatusIds.includes(t.statusId)
      );
      return entityOverdue.length > 0;
    }).length;

    // Entity distribution
    const entityDistribution = entityData.map(entity => {
      const entityTasks = allTasks.filter(t => t.entityId === entity.id);
      return {
        name: entity.name,
        totalTasks: entityTasks.length,
        type: entity.entityType
      };
    });

    // Jurisdiction risks (simplified)
    const jurisdictionRisks = entityData.reduce((acc: any, entity) => {
      const jurisdiction = entity.taxJurisdiction || 'Unknown';
      if (!acc[jurisdiction]) {
        acc[jurisdiction] = 0;
      }
      const entityTasks = allTasks.filter(t => t.entityId === entity.id);
      const entityOverdue = entityTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && !completedStatusIds.includes(t.statusId)
      );
      acc[jurisdiction] += entityOverdue.length;
      return acc;
    }, {});

    return {
      totalTasks,
      upcomingDeadlines,
      overdueItems,
      entitiesAtRisk,
      completionRate: Math.round(completionRate * 10) / 10,
      entityDistribution,
      jurisdictionRisks
    };
  }

  private async getTeamEfficiencyData(tenantId: number, filters: any) {
    const allTasks = await db
      .select({
        id: tasks.id,
        statusId: tasks.statusId,
        assigneeId: tasks.assigneeId,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
      })
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId));

    const userData = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const departmentData = await db
      .select()
      .from(departments)
      .where(eq(departments.tenantId, tenantId));

    const statusData = await db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.tenantId, tenantId));

    const completedStatusIds = statusData
      .filter(s => s.name?.toLowerCase().includes('completed') || s.name?.toLowerCase().includes('done'))
      .map(s => s.id);

    const totalMembers = userData.length;
    const avgWorkload = totalMembers > 0 ? allTasks.length / totalMembers : 0;
    
    const completedTasks = allTasks.filter(t => completedStatusIds.includes(t.statusId)).length;
    const teamCompletionRate = allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0;

    // Department stats
    const departmentStats = departmentData.map(dept => {
      const deptUsers = userData.filter(u => u.departmentId === dept.id);
      const deptTasks = allTasks.filter(t => 
        deptUsers.some(u => u.id === t.assigneeId)
      );
      const deptCompleted = deptTasks.filter(t => completedStatusIds.includes(t.statusId));
      
      return {
        name: dept.name,
        members: deptUsers.length,
        totalTasks: deptTasks.length,
        completionRate: deptTasks.length > 0 ? (deptCompleted.length / deptTasks.length) * 100 : 0
      };
    });

    // Individual stats
    const individualStats = userData.map(user => {
      const userTasks = allTasks.filter(t => t.assigneeId === user.id);
      const userCompleted = userTasks.filter(t => completedStatusIds.includes(t.statusId));
      
      return {
        name: user.displayName,
        totalTasks: userTasks.length,
        completedTasks: userCompleted.length,
        completionRate: userTasks.length > 0 ? (userCompleted.length / userTasks.length) * 100 : 0
      };
    });

    // Workload distribution
    const workloadDistribution = {
      overloaded: individualStats.filter(u => u.totalTasks > avgWorkload * 1.5).length,
      balanced: individualStats.filter(u => u.totalTasks >= avgWorkload * 0.5 && u.totalTasks <= avgWorkload * 1.5).length,
      underutilized: individualStats.filter(u => u.totalTasks < avgWorkload * 0.5).length
    };

    return {
      totalMembers,
      avgWorkload: Math.round(avgWorkload * 10) / 10,
      teamCompletionRate: Math.round(teamCompletionRate * 10) / 10,
      departmentStats,
      individualStats,
      workloadDistribution
    };
  }

  private async getRiskAssessmentData(tenantId: number, filters: any) {
    const allTasks = await db
      .select({
        id: tasks.id,
        statusId: tasks.statusId,
        dueDate: tasks.dueDate,
        entityId: tasks.entityId,
        clientId: tasks.clientId,
        taskType: tasks.taskType,
      })
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId));

    const statusData = await db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.tenantId, tenantId));

    const clientData = await db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, tenantId));

    const completedStatusIds = statusData
      .filter(s => s.name?.toLowerCase().includes('completed') || s.name?.toLowerCase().includes('done'))
      .map(s => s.id);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // High risk tasks (overdue + critical upcoming)
    const overdueTasks = allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && !completedStatusIds.includes(t.statusId)
    );
    
    const criticalUpcoming = allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= sevenDaysFromNow
    );

    const highRiskTasks = overdueTasks.length + criticalUpcoming.length;
    const overdueCritical = overdueTasks.length;
    const criticalDeadlines = criticalUpcoming.length;

    // Entities with multiple risks
    const entityRiskCount = new Map();
    [...overdueTasks, ...criticalUpcoming].forEach(task => {
      if (task.entityId) {
        entityRiskCount.set(task.entityId, (entityRiskCount.get(task.entityId) || 0) + 1);
      }
    });
    
    const multiRiskEntities = Array.from(entityRiskCount.values()).filter(count => count > 1).length;

    // Risk distribution
    const riskDistribution = {
      overdue: overdueTasks.length,
      critical: criticalUpcoming.length,
      upcoming: allTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) > sevenDaysFromNow && new Date(t.dueDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      ).length
    };

    // Client risk profiles
    const clientRisks = clientData.map(client => {
      const clientTasks = allTasks.filter(t => t.clientId === client.id);
      const clientOverdue = clientTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && !completedStatusIds.includes(t.statusId)
      );
      
      return {
        name: client.name,
        totalTasks: clientTasks.length,
        riskTasks: clientOverdue.length,
        riskLevel: clientOverdue.length > 2 ? 'high' : clientOverdue.length > 0 ? 'medium' : 'low'
      };
    });

    return {
      highRiskTasks,
      overdueCritical,
      multiRiskEntities,
      criticalDeadlines,
      riskDistribution,
      clientRisks
    };
  }

  private getFallbackInsights(reportType: string): ReportInsight[] {
    const fallbacks = {
      'task-performance': [
        {
          type: 'info' as const,
          title: 'Performance Analysis Available',
          description: 'Task performance data is being analyzed for insights.',
          recommendation: 'Review your task completion rates and team productivity metrics.',
          priority: 'medium' as const,
          metric: 'Analysis Status',
          value: 'In Progress'
        }
      ],
      'compliance': [
        {
          type: 'info' as const,
          title: 'Compliance Monitoring Active',
          description: 'Compliance deadlines and requirements are being tracked.',
          recommendation: 'Check upcoming deadlines and ensure timely completion.',
          priority: 'medium' as const,
          metric: 'Monitoring Status',
          value: 'Active'
        }
      ],
      'team-efficiency': [
        {
          type: 'info' as const,
          title: 'Team Analysis Ready',
          description: 'Team productivity and workload distribution data is available.',
          recommendation: 'Review team workload balance and productivity patterns.',
          priority: 'medium' as const,
          metric: 'Analysis Status',
          value: 'Ready'
        }
      ],
      'risk-assessment': [
        {
          type: 'info' as const,
          title: 'Risk Monitoring Enabled',
          description: 'Risk assessment and monitoring systems are operational.',
          recommendation: 'Review high-risk items and implement mitigation strategies.',
          priority: 'medium' as const,
          metric: 'Monitoring Status',
          value: 'Enabled'
        }
      ]
    };

    return fallbacks[reportType] || [];
  }
}