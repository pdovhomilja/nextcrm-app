import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  Bot, 
  Lightbulb, 
  FileText, 
  BarChart3, 
  Users, 
  Settings, 
  HelpCircle, 
  MessageSquare, 
  Brain, 
  Code, 
  TrendingUp,
  Search,
  Target,
  Activity,
  Zap
} from "lucide-react";

const DocumentationPage = () => {
  return (
    <SidebarInset>
      <SiteHeader title="Documentation">
        <div className="flex items-center gap-2">
          <Badge variant="outline">AI-Powered</Badge>
          <Badge variant="secondary">Phase 2</Badge>
        </div>
      </SiteHeader>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">TaskHQ AI Documentation</h1>
            <p className="text-muted-foreground">Comprehensive guide to AI-powered task management</p>
          </div>

          <Tabs defaultValue="getting-started" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
              <TabsTrigger value="advanced-ai">Advanced AI</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Getting Started Tab */}
            <TabsContent value="getting-started" className="space-y-6">
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Getting Started with TaskHQ AI</h2>
                  <p className="text-muted-foreground">Your comprehensive guide to AI-powered task management</p>
                </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Prerequisites
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Verified company account</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Email verification completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Basic TaskHQ access permissions</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Start Checklist</CardTitle>
                <CardDescription>Complete these steps to get started with AI features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">1. Account Setup and Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Ensure your email is verified and you can access your company dashboard. 
                    Email verification is required to unlock AI features.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">2. Accessing AI Features</h4>
                  <p className="text-sm text-muted-foreground">
                    Look for the AI assistant icon in your dashboard and task boards. 
                    AI features are available throughout the platform once your email is verified.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">3. Basic AI Assistant Interaction</h4>
                  <p className="text-sm text-muted-foreground">
                    Start by asking simple questions about your projects or tasks. 
                    The AI assistant can help analyze workload, suggest optimizations, and provide insights.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">4. Understanding AI Suggestions</h4>
                  <p className="text-sm text-muted-foreground">
                    Watch for yellow suggestion cards that appear in your task boards. 
                    These contain AI-generated recommendations you can accept, dismiss, or modify.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">5. Getting Help and Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the help section or contact support if you encounter issues. 
                    The AI assistant can also answer questions about how to use features.
                  </p>
                </div>
              </CardContent>
            </Card>
              </section>

              {/* AI Features Overview */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">AI Features Overview</h3>
                  <p className="text-muted-foreground">Comprehensive overview of AI-powered capabilities</p>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    AI Assistant
                  </CardTitle>
                  <CardDescription>Interactive project management helper</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">Purpose</h4>
                    <p className="text-sm text-muted-foreground">
                      Interactive project management helper available throughout the platform
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Access</h4>
                    <p className="text-sm text-muted-foreground">
                      Available in dashboard and task views via floating panel or sidebar
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Capabilities</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Task analysis and recommendations</li>
                      <li>• Project status inquiries</li>
                      <li>• Workload optimization suggestions</li>
                      <li>• Progress tracking insights</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    Smart Suggestions
                  </CardTitle>
                  <CardDescription>AI-powered task and workflow optimization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">Auto-suggestions</h4>
                    <p className="text-sm text-muted-foreground">
                      AI-generated task recommendations that appear as yellow cards
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Priority Optimization</h4>
                    <p className="text-sm text-muted-foreground">
                      Dynamic priority suggestions based on project context and deadlines
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Assignment Recommendations</h4>
                    <p className="text-sm text-muted-foreground">
                      Skill-based task assignments considering team member availability
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Deadline Predictions</h4>
                    <p className="text-sm text-muted-foreground">
                      Timeline optimization with realistic completion estimates
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    Document Intelligence
                  </CardTitle>
                  <CardDescription>AI-powered document processing and analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">File Processing</h4>
                    <p className="text-sm text-muted-foreground">
                      PDF, DOCX, Excel files, and images with OCR capabilities
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Content Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      AI-powered summarization of documents and key information extraction
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Insight Extraction</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatic identification of action items and important points
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Search Enhancement</h4>
                    <p className="text-sm text-muted-foreground">
                      Semantic document search that understands context and meaning
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Analytics & Insights
                  </CardTitle>
                  <CardDescription>Automated project health and performance analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">Project Health</h4>
                    <p className="text-sm text-muted-foreground">
                      Automated health scoring based on progress, deadlines, and team performance
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Bottleneck Detection</h4>
                    <p className="text-sm text-muted-foreground">
                      Performance issue identification and suggested resolutions
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Team Efficiency</h4>
                    <p className="text-sm text-muted-foreground">
                      Productivity analytics and workload distribution insights
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Trend Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Historical pattern recognition for improved future planning
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
              </section>

              {/* UI Interface Guide */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">TaskHQ AI Interface Guide</h3>
                  <p className="text-muted-foreground">Navigate AI features with confidence</p>
                </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    AI Assistant Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">Location</h4>
                    <p className="text-sm text-muted-foreground">
                      Floating panel (bottom-right) or accessible via sidebar
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Activation</h4>
                    <p className="text-sm text-muted-foreground">
                      Click AI assistant icon or use keyboard shortcut
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Features</h4>
                    <p className="text-sm text-muted-foreground">
                      Chat interface, conversation history, and quick action buttons
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    Smart Suggestion Cards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">Location</h4>
                    <p className="text-sm text-muted-foreground">
                      Task boards and dashboard widgets
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Types</h4>
                    <p className="text-sm text-muted-foreground">
                      Yellow suggestion cards with AI insights and recommendations
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Actions</h4>
                    <p className="text-sm text-muted-foreground">
                      Accept, dismiss, or modify suggestions to fit your workflow
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    AI-Enhanced Forms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">Task Creation</h4>
                    <p className="text-sm text-muted-foreground">
                      AI suggestions for task titles, descriptions, and categorization
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Enhancement Button</h4>
                    <p className="text-sm text-muted-foreground">
                      &ldquo;✨ Enhance with AI&rdquo; button for improved content suggestions
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Auto-completion</h4>
                    <p className="text-sm text-muted-foreground">
                      Intelligent field suggestions based on project context
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Analytics Dashboards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">Project Insights</h4>
                    <p className="text-sm text-muted-foreground">
                      AI-generated project health reports with actionable recommendations
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Performance Metrics</h4>
                    <p className="text-sm text-muted-foreground">
                      Real-time efficiency analytics and team performance indicators
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Trend Visualization</h4>
                    <p className="text-sm text-muted-foreground">
                      Historical data visualization with AI-powered trend analysis
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
              </section>

              {/* Support and Resources */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Support & Resources</h3>
                  <p className="text-muted-foreground">Get help when you need it</p>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    Common Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• How to verify email for AI access</li>
                    <li>• Troubleshooting AI assistant issues</li>
                    <li>• Understanding AI suggestions</li>
                    <li>• Managing AI preferences</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Team Training
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• User onboarding guides</li>
                    <li>• Best practices documentation</li>
                    <li>• Advanced feature tutorials</li>
                    <li>• Integration workflows</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• AI service availability</li>
                    <li>• Feature update notifications</li>
                    <li>• Performance monitoring</li>
                    <li>• Maintenance schedules</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        </TabsContent>

        {/* Advanced AI Assistant Tab */}
        <TabsContent value="advanced-ai" className="space-y-6">
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Mastering the AI Assistant</h2>
              <p className="text-muted-foreground">Advanced conversational patterns and power user features</p>
            </div>

            {/* Advanced Conversation Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Advanced Conversation Patterns
                </CardTitle>
                <CardDescription>Context-aware interactions and complex queries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Context-Aware Interactions</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• &ldquo;Show me overdue tasks in this project&rdquo;</li>
                      <li>• &ldquo;What should I prioritize based on my workload?&rdquo;</li>
                      <li>• &ldquo;Analyze our progress this week&rdquo;</li>
                      <li>• &ldquo;Who&rsquo;s available for urgent tasks?&rdquo;</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Multi-Step Workflows</h4>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      <li>1. &ldquo;Analyze project health&rdquo;</li>
                      <li>2. &ldquo;What are the main bottlenecks?&rdquo;</li>
                      <li>3. &ldquo;Suggest optimization strategies&rdquo;</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Commands Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-green-600" />
                  Advanced Commands Reference
                </CardTitle>
                <CardDescription>Power user commands for efficient AI interactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Project Management</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-muted p-2 rounded font-mono">analyze project [board-name]</div>
                      <div className="bg-muted p-2 rounded font-mono">suggest priorities</div>
                      <div className="bg-muted p-2 rounded font-mono">optimize workload [user]</div>
                      <div className="bg-muted p-2 rounded font-mono">predict completion</div>
                      <div className="bg-muted p-2 rounded font-mono">identify bottlenecks</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Data Queries</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-muted p-2 rounded font-mono">show metrics [timeframe]</div>
                      <div className="bg-muted p-2 rounded font-mono">compare [period1] vs [period2]</div>
                      <div className="bg-muted p-2 rounded font-mono">list dependencies</div>
                      <div className="bg-muted p-2 rounded font-mono">find similar [task]</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Collaboration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-muted p-2 rounded font-mono">suggest assignments</div>
                      <div className="bg-muted p-2 rounded font-mono">check team capacity</div>
                      <div className="bg-muted p-2 rounded font-mono">schedule review</div>
                      <div className="bg-muted p-2 rounded font-mono">create action items</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Memory & Personalization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI Memory & Personalization
                </CardTitle>
                <CardDescription>Understanding how AI learns and adapts to your workflow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Memory Types</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-blue-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium">Session Memory</p>
                          <p className="text-xs text-muted-foreground">Conversation context within current session</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-green-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium">User Preferences</p>
                          <p className="text-xs text-muted-foreground">Learned communication style and priorities</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-orange-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium">Project Context</p>
                          <p className="text-xs text-muted-foreground">Ongoing project awareness and history</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-purple-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium">Team Dynamics</p>
                          <p className="text-xs text-muted-foreground">Understanding of team roles and relationships</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Personalization Features</h4>
                    <div className="space-y-2 text-sm">
                      <div className="p-3 border rounded">
                        <strong>Communication Style:</strong> Formal, casual, concise, or detailed responses
                      </div>
                      <div className="p-3 border rounded">
                        <strong>Priority Frameworks:</strong> Personal productivity methodologies
                      </div>
                      <div className="p-3 border rounded">
                        <strong>Notification Preferences:</strong> AI suggestion timing and frequency
                      </div>
                      <div className="p-3 border rounded">
                        <strong>Workspace Customization:</strong> Preferred views and data presentations
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* Document Processing Tab */}
        <TabsContent value="documents" className="space-y-6">
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Advanced Document Processing</h2>
              <p className="text-muted-foreground">Master AI-powered document workflows and intelligence</p>
            </div>

            {/* File Format Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Supported Formats & Processing
                </CardTitle>
                <CardDescription>Comprehensive file support with AI processing capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-600">PDF Documents</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Text extraction</li>
                      <li>• OCR for scanned docs</li>
                      <li>• Form processing</li>
                      <li>• Multi-page analysis</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-600">Microsoft Office</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Word (.docx)</li>
                      <li>• Excel (.xlsx)</li>
                      <li>• PowerPoint (.pptx)</li>
                      <li>• Metadata extraction</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-purple-600">Text Formats</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Markdown (.md)</li>
                      <li>• Plain text (.txt)</li>
                      <li>• CSV files</li>
                      <li>• Code files</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-orange-600">Images & Archives</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• PNG, JPEG, WebP</li>
                      <li>• OCR text extraction</li>
                      <li>• ZIP batch processing</li>
                      <li>• Image analysis</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Workflow Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Workflow Integration
                </CardTitle>
                <CardDescription>Task enhancement workflows with intelligent document processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300">Requirements Analysis</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Upload requirements document → AI extracts tasks → Auto-create task list
                    </p>
                  </div>
                  <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
                    <h4 className="font-medium text-green-700 dark:text-green-300">Meeting Notes Processing</h4>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Upload meeting notes → AI identifies action items → Create assigned tasks
                    </p>
                  </div>
                  <div className="p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950">
                    <h4 className="font-medium text-purple-700 dark:text-purple-300">Report Analysis</h4>
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      Upload project reports → AI extracts insights → Update project status
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-indigo-600" />
                  Advanced Search Techniques
                </CardTitle>
                <CardDescription>Semantic search and intelligent document discovery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Semantic Search Queries</h4>
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-muted rounded">
                        <strong>Concept-Based:</strong> &ldquo;Find documents about project risks&rdquo;
                        <p className="text-muted-foreground text-xs mt-1">Finds risk-related content regardless of exact terms</p>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <strong>Question-Based:</strong> &ldquo;What are our quality standards?&rdquo;
                        <p className="text-muted-foreground text-xs mt-1">Searches for relevant policy documents</p>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <strong>Context-Aware:</strong> &ldquo;Show meeting notes from Q3 about budget&rdquo;
                        <p className="text-muted-foreground text-xs mt-1">Combines time, type, and topic filters</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Search Filters & Refinement</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Date Ranges</Badge>
                        <span className="text-muted-foreground">Time-based filtering</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Document Types</Badge>
                        <span className="text-muted-foreground">Format-specific searches</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Project Context</Badge>
                        <span className="text-muted-foreground">Board or task-specific</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Author/Uploader</Badge>
                        <span className="text-muted-foreground">User-specific filtering</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Content Similarity</Badge>
                        <span className="text-muted-foreground">Find similar documents</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Mastering AI-Powered Analytics</h2>
              <p className="text-muted-foreground">Advanced analytics, insights interpretation, and optimization strategies</p>
            </div>

            {/* Analytics Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Analytics Dashboard Deep Dive
                </CardTitle>
                <CardDescription>Understanding and leveraging advanced metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Project Health Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Completion Velocity</p>
                          <p className="text-xs text-muted-foreground">Task completion rate trends</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Target className="h-4 w-4 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">Bottleneck Analysis</p>
                          <p className="text-xs text-muted-foreground">Automated issue identification</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">Resource Utilization</p>
                          <p className="text-xs text-muted-foreground">Team capacity and efficiency</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-sm font-medium">Quality Indicators</p>
                          <p className="text-xs text-muted-foreground">Bug rates, rework, satisfaction</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Predictive Analytics</h4>
                    <div className="space-y-2">
                      <div className="p-3 border rounded">
                        <strong className="text-sm">Timeline Predictions</strong>
                        <p className="text-xs text-muted-foreground mt-1">AI-generated project completion estimates</p>
                      </div>
                      <div className="p-3 border rounded">
                        <strong className="text-sm">Risk Assessment</strong>
                        <p className="text-xs text-muted-foreground mt-1">Probability analysis for project risks</p>
                      </div>
                      <div className="p-3 border rounded">
                        <strong className="text-sm">Resource Forecasting</strong>
                        <p className="text-xs text-muted-foreground mt-1">Future team capacity planning</p>
                      </div>
                      <div className="p-3 border rounded">
                        <strong className="text-sm">Trend Projections</strong>
                        <p className="text-xs text-muted-foreground mt-1">Performance trajectory analysis</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insight Interpretation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  AI Insight Interpretation
                </CardTitle>
                <CardDescription>Understanding confidence scores and insight categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Confidence Scores</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div>
                          <p className="text-sm font-medium">High (90-100%)</p>
                          <p className="text-xs text-muted-foreground">Actionable insights based on strong data patterns</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div>
                          <p className="text-sm font-medium">Medium (70-89%)</p>
                          <p className="text-xs text-muted-foreground">Probable trends requiring validation</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <div>
                          <p className="text-sm font-medium">Low (50-69%)</p>
                          <p className="text-xs text-muted-foreground">Preliminary insights needing more data</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <div>
                          <p className="text-sm font-medium">Exploratory (&lt;50%)</p>
                          <p className="text-xs text-muted-foreground">Early indicators worth monitoring</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Insight Categories</h4>
                    <div className="space-y-2">
                      <div className="p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Performance Insights</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Team and individual productivity analysis</p>
                      </div>
                      <div className="p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Process Insights</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Workflow optimization opportunities</p>
                      </div>
                      <div className="p-3 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950">
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Strategic Insights</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Long-term planning recommendations</p>
                      </div>
                      <div className="p-3 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Operational Insights</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">Day-to-day efficiency improvements</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Optimization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Performance Optimization Strategies
                </CardTitle>
                <CardDescription>Using AI insights for continuous improvement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Continuous Improvement Loop</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
                      <div className="p-3 border rounded">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-sm font-bold text-blue-600">1</span>
                        </div>
                        <p className="text-xs font-medium">Baseline Establishment</p>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-sm font-bold text-green-600">2</span>
                        </div>
                        <p className="text-xs font-medium">AI Insight Review</p>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-sm font-bold text-purple-600">3</span>
                        </div>
                        <p className="text-xs font-medium">Action Implementation</p>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-sm font-bold text-orange-600">4</span>
                        </div>
                        <p className="text-xs font-medium">Impact Measurement</p>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-sm font-bold text-red-600">5</span>
                        </div>
                        <p className="text-xs font-medium">Iteration</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Optimization Focus Areas</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Bottleneck resolution based on AI identification</li>
                        <li>• Workload balancing using AI distribution suggestions</li>
                        <li>• Skill development targeting AI-identified gaps</li>
                        <li>• Process refinement through AI pattern analysis</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Success Metrics</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Task completion velocity improvements</li>
                        <li>• Reduced project delivery times</li>
                        <li>• Enhanced team satisfaction scores</li>
                        <li>• Decreased bottleneck occurrence</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        </Tabs>
        </div>
      </div>
    </SidebarInset>
  );
};

export default DocumentationPage;
