# Phase 3: GPT-5 Model Optimization

**Priority**: ⚠️ **MEDIUM PRIORITY**  
**Duration**: 1-2 days  
**Risk**: None - Optional optimization for cost/performance

## 🎯 **Objective**

Optimize AI model selection across TaskHQ to leverage the GPT-5 model family for optimal cost/performance balance based on use case requirements.

## 📊 **GPT-5 Model Family Overview**

### **GPT-5 (Reasoning Model)**
- **Use for**: Complex project analysis, strategic recommendations, multi-step problem solving
- **TaskHQ Applications**: Board health analysis, resource optimization, project risk assessment
- **Performance**: Highest quality reasoning but slower response times
- **Cost**: Highest cost per token

### **GPT-5-Mini (Fast Response)**  
- **Use for**: General chat interactions, task queries, quick recommendations
- **TaskHQ Applications**: AI assistant conversations, task search, simple suggestions
- **Performance**: Good quality with fast response times
- **Cost**: Moderate cost per token

### **GPT-5-Nano (Ultra-Fast)**
- **Use for**: Real-time interactions, auto-completion, simple classifications  
- **TaskHQ Applications**: Search suggestions, quick status updates, simple categorization
- **Performance**: Basic quality but ultra-fast responses
- **Cost**: Lowest cost per token

## 🔧 **Implementation Tasks**

### Task 1: Update AI Configuration

**File**: `/lib/ai/config.ts`

**Current Configuration**:
```typescript
export const aiConfig = {
  chatModel: openai(process.env.AI_MODEL || "gpt-5"),
  structuredOutputModel: openai(process.env.AI_STRUCTURED_MODEL || "gpt-5"),
  embeddingModel: openai.embedding(
    process.env.EMBEDDING_MODEL || "text-embedding-ada-002"
  ),
};
```

**Optimized Configuration**:
```typescript
export const aiConfig = {
  // Fast interactions - most common use case
  chatModel: openai(process.env.AI_MODEL || "gpt-5-mini"),
  
  // Complex analysis and structured outputs
  structuredOutputModel: openai(process.env.AI_STRUCTURED_MODEL || "gpt-5"),
  
  // Ultra-fast for real-time features
  realtimeModel: openai(process.env.AI_REALTIME_MODEL || "gpt-5-nano"),
  
  // Embedding model (unchanged - already optimal)
  embeddingModel: openai.embedding(
    process.env.EMBEDDING_MODEL || "text-embedding-3-small"
  ),
  
  // Model selection based on context
  modelSelection: {
    chat: "gpt-5-mini",
    analysis: "gpt-5", 
    realtime: "gpt-5-nano",
    structured: "gpt-5",
    embedding: "text-embedding-3-small"
  }
};

/**
 * Get optimal model based on use case
 */
export function getModelForUseCase(useCase: 'chat' | 'analysis' | 'realtime' | 'structured') {
  const modelMap = {
    chat: aiConfig.chatModel,        // gpt-5-mini
    analysis: aiConfig.structuredOutputModel, // gpt-5  
    realtime: aiConfig.realtimeModel, // gpt-5-nano
    structured: aiConfig.structuredOutputModel // gpt-5
  };
  
  return modelMap[useCase] || aiConfig.chatModel;
}
```

### Task 2: Context-Aware Model Selection

**Create Model Selection Service**:

**File**: `/lib/ai/model-selector.ts`
```typescript
import { aiConfig } from './config';

export type UseCaseType = 
  | 'general_chat'           // User conversations, simple Q&A
  | 'task_search'            // Finding tasks, basic queries  
  | 'task_creation'          // Creating tasks, simple operations
  | 'project_analysis'       // Board health, performance analysis
  | 'strategic_planning'     // Complex recommendations, insights
  | 'real_time_suggestions'  // Auto-complete, quick suggestions
  | 'intent_classification'  // Agent decision making
  | 'data_extraction';       // Parsing, structured data

export class ModelSelector {
  /**
   * Select optimal model based on use case and context
   */
  static selectModel(useCase: UseCaseType, context?: {
    complexity?: 'low' | 'medium' | 'high';
    responseTime?: 'fast' | 'balanced' | 'quality';
    tokenBudget?: 'minimal' | 'moderate' | 'unlimited';
  }) {
    const { complexity = 'medium', responseTime = 'balanced', tokenBudget = 'moderate' } = context || {};

    // High complexity or quality-focused use cases
    if (complexity === 'high' || responseTime === 'quality') {
      return aiConfig.structuredOutputModel; // GPT-5
    }

    // Real-time or speed-focused use cases
    if (responseTime === 'fast' || tokenBudget === 'minimal') {
      return aiConfig.realtimeModel; // GPT-5-Nano
    }

    // Use case specific optimization
    switch (useCase) {
      case 'project_analysis':
      case 'strategic_planning':
      case 'intent_classification':
        return aiConfig.structuredOutputModel; // GPT-5 for reasoning
      
      case 'real_time_suggestions':
        return aiConfig.realtimeModel; // GPT-5-Nano for speed
      
      case 'general_chat':
      case 'task_search':
      case 'task_creation':
      case 'data_extraction':
      default:
        return aiConfig.chatModel; // GPT-5-Mini balanced option
    }
  }

  /**
   * Get model configuration with usage tracking
   */
  static getModelConfig(useCase: UseCaseType, context?: any) {
    const model = this.selectModel(useCase, context);
    
    // Log model selection for optimization analysis
    console.log(`Model selected: ${model.modelId} for use case: ${useCase}`, {
      context,
      timestamp: new Date().toISOString()
    });

    return {
      model,
      useCase,
      selectedModelId: model.modelId || 'unknown'
    };
  }
}
```

### Task 3: Update Existing AI Service Implementations

#### Update Agent Core Decision Making
**File**: `/lib/ai/agent-core.ts`

```typescript
import { ModelSelector } from './model-selector';

// In makeDecision method:
const intentResult = await generateObject({
  model: ModelSelector.selectModel('intent_classification', { 
    complexity: 'high',
    responseTime: 'quality' 
  }),
  // ... rest of implementation
});
```

#### Update RAG Processor
**File**: `/lib/ai/rag-processor.ts`

```typescript
import { ModelSelector } from './model-selector';

// In classifyQuery method:
const result = await generateObject({
  model: ModelSelector.selectModel('intent_classification', {
    complexity: 'medium',
    responseTime: 'balanced'
  }),
  // ... rest of implementation
});

// In generateResponse method:
const response = await generateText({
  model: ModelSelector.selectModel('general_chat', {
    complexity: queryComplexity,
    responseTime: 'balanced'
  }),
  // ... rest of implementation
});
```

#### Update AI Assistant Components
**File**: `/components/ai/ai-assistant-v2.ts`

```typescript
import { ModelSelector } from '@/lib/ai/model-selector';

// For general conversations
const model = ModelSelector.selectModel('general_chat', {
  responseTime: 'fast',
  tokenBudget: 'moderate'
});

// For complex analysis requests  
const analysisModel = ModelSelector.selectModel('project_analysis', {
  complexity: 'high',
  responseTime: 'quality'
});
```

### Task 4: Environment Configuration Updates

**Update Environment Variables**:

```bash
# .env.example
# GPT-5 Model Family Configuration
AI_MODEL="gpt-5-mini"              # Default chat model
AI_STRUCTURED_MODEL="gpt-5"        # Complex analysis model  
AI_REALTIME_MODEL="gpt-5-nano"     # Fast response model
EMBEDDING_MODEL="text-embedding-3-small"

# Model selection preferences
AI_OPTIMIZE_FOR="cost"             # Options: cost, quality, speed, balanced
AI_DEFAULT_COMPLEXITY="medium"     # Options: low, medium, high
AI_LOG_MODEL_USAGE="true"         # Track model usage for optimization
```

### Task 5: Cost Optimization & Monitoring

**Create Cost Tracking Service**:

**File**: `/lib/ai/cost-monitor.ts`
```typescript
interface ModelUsage {
  modelId: string;
  useCase: string;
  tokenCount: number;
  requestCount: number;
  estimatedCost: number;
  timestamp: Date;
}

export class CostMonitor {
  private static usage: ModelUsage[] = [];

  /**
   * Track model usage and estimated costs
   */
  static trackUsage(modelId: string, useCase: string, tokens: number) {
    const costPerToken = this.getCostPerToken(modelId);
    const estimatedCost = tokens * costPerToken;

    this.usage.push({
      modelId,
      useCase,
      tokenCount: tokens,
      requestCount: 1,
      estimatedCost,
      timestamp: new Date()
    });

    // Log if usage exceeds thresholds
    if (this.usage.length % 100 === 0) {
      this.logCostSummary();
    }
  }

  /**
   * Get cost per token for different models
   */
  private static getCostPerToken(modelId: string): number {
    const costs = {
      'gpt-5': 0.00002,        // Estimated - highest cost
      'gpt-5-mini': 0.00001,   // Estimated - moderate cost
      'gpt-5-nano': 0.000005,  // Estimated - lowest cost  
      'text-embedding-3-small': 0.00000002 // Current embedding cost
    };

    return costs[modelId as keyof typeof costs] || 0.00001;
  }

  /**
   * Generate cost optimization recommendations
   */
  static generateOptimizationReport() {
    const totalCost = this.usage.reduce((sum, usage) => sum + usage.estimatedCost, 0);
    const usageByModel = this.groupUsageByModel();
    
    return {
      totalEstimatedCost: totalCost,
      usageBreakdown: usageByModel,
      recommendations: this.generateRecommendations(usageByModel)
    };
  }

  private static generateRecommendations(usageByModel: any) {
    const recommendations = [];
    
    // Check for overuse of expensive models
    if (usageByModel['gpt-5']?.percentage > 30) {
      recommendations.push("Consider using GPT-5-Mini for general conversations to reduce costs");
    }
    
    // Check for underuse of fast models
    if (usageByModel['gpt-5-nano']?.percentage < 10) {
      recommendations.push("Consider using GPT-5-Nano for simple, real-time interactions");
    }

    return recommendations;
  }
}
```

## 🧪 **Testing Strategy**

### Performance Testing

**Response Time Benchmarks**:
```typescript
// Test different models for same task
const testQuery = "Find all high priority tasks assigned to the development team";

const testModels = async () => {
  // GPT-5-Nano (Ultra-fast)
  const startNano = Date.now();
  const nanoResponse = await generateText({
    model: aiConfig.realtimeModel,
    prompt: testQuery
  });
  const nanoTime = Date.now() - startNano;

  // GPT-5-Mini (Fast)  
  const startMini = Date.now();
  const miniResponse = await generateText({
    model: aiConfig.chatModel,
    prompt: testQuery
  });
  const miniTime = Date.now() - startMini;

  // GPT-5 (Quality)
  const startFull = Date.now();
  const fullResponse = await generateText({
    model: aiConfig.structuredOutputModel, 
    prompt: testQuery
  });
  const fullTime = Date.now() - startFull;

  console.log(`Response times: Nano: ${nanoTime}ms, Mini: ${miniTime}ms, Full: ${fullTime}ms`);
};
```

### Quality Assessment

**A/B Test Framework**:
```typescript
// Compare response quality across models
const qualityTest = async (queries: string[]) => {
  const results = [];
  
  for (const query of queries) {
    const responses = await Promise.all([
      generateText({ model: aiConfig.realtimeModel, prompt: query }),
      generateText({ model: aiConfig.chatModel, prompt: query }),
      generateText({ model: aiConfig.structuredOutputModel, prompt: query })
    ]);

    results.push({
      query,
      responses: {
        nano: responses[0].text,
        mini: responses[1].text, 
        full: responses[2].text
      }
    });
  }

  return results;
};
```

## ✅ **Success Metrics**

### Performance Targets:
- **GPT-5-Nano**: <500ms average response time
- **GPT-5-Mini**: <1500ms average response time  
- **GPT-5**: <3000ms average response time
- **Overall App**: 20-30% reduction in AI response times

### Cost Targets:
- **25-40% cost reduction** through optimal model selection
- **Maintain quality** for complex analysis tasks
- **Improve speed** for simple interactions

### Quality Targets:
- **No degradation** in complex reasoning tasks
- **Acceptable quality** for general conversations
- **User satisfaction** maintained or improved

## 📊 **Monitoring & Analytics**

### Metrics to Track:
- Response times by model and use case
- Token usage and estimated costs
- User satisfaction ratings  
- Error rates by model
- Model selection distribution

### Dashboards:
- Model usage analytics
- Cost optimization opportunities
- Performance comparisons
- Quality assessments

## ✅ **Validation Checklist**

- [ ] **AI configuration updated with GPT-5 model family**
- [ ] **Model selection service implemented and tested**
- [ ] **Existing AI services updated to use optimal models**
- [ ] **Environment variables configured correctly**
- [ ] **Cost monitoring system implemented**
- [ ] **Performance benchmarks show expected improvements**
- [ ] **Quality maintained for critical use cases**
- [ ] **Cost reduction targets achieved**
- [ ] **No regression in existing functionality**
- [ ] **Monitoring and analytics systems operational**

## 🎯 **Expected Benefits**

### Cost Optimization:
- **25-40% reduction** in AI API costs
- **Better resource allocation** across different use cases
- **Predictable cost scaling** with usage growth

### Performance Improvement:
- **20-30% faster** general AI interactions
- **50-70% faster** simple/real-time responses
- **Maintained quality** for complex analysis

### User Experience:
- **More responsive** AI assistant interactions
- **Faster search** and task management operations
- **Better overall** application performance

## 📝 **Next Phase**

Upon successful completion and cost/performance validation, proceed to **Phase 4: MCP Production Enhancements** for security and scalability improvements.