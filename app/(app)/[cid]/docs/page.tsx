import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Bot, Lightbulb, FileText, BarChart3, Users, Settings, HelpCircle } from "lucide-react";

const DocumentationPage = () => {
  return (
    <SidebarInset>
      <SiteHeader title="Documentation">
        <div className="flex items-center gap-2">
          <Badge variant="outline">AI-Powered</Badge>
        </div>
      </SiteHeader>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
          {/* Getting Started Section */}
          <section className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Getting Started with TaskHQ AI</h1>
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
          <section className="space-y-4 mt-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">AI Features Overview</h2>
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
          <section className="space-y-4 mt-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">TaskHQ AI Interface Guide</h2>
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
          <section className="space-y-4 mt-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Support & Resources</h2>
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
        </div>
      </div>
    </SidebarInset>
  );
};

export default DocumentationPage;
