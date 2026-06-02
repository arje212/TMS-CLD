import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Users, ClipboardList, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: LayoutDashboard,
      title: 'Admin Dashboard',
      description: 'Comprehensive overview of all training activities, attendance rates, and real-time statistics'
    },
    {
      icon: ClipboardList,
      title: 'Attendance Tracking',
      description: 'Real-time RFID/QR code scanning for instant check-in and automated attendance records'
    },
    {
      icon: Users,
      title: 'Trainee Management',
      description: 'Complete trainee profiles with training history, completion status, and performance tracking'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Reports',
      description: 'Generate detailed analytics, export data to PDF/Excel, and track completion rates'
    },
    {
      icon: CheckCircle,
      title: 'Training Scheduler',
      description: 'Schedule upcoming sessions, manage locations, and assign trainees with automated notifications'
    },
    {
      icon: Clock,
      title: 'Real-time Updates',
      description: 'Live attendance monitoring and instant updates across all connected devices'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Training Monitoring System - Professional Training Management</title>
        <meta name="description" content="Complete training management solution with real-time attendance tracking, comprehensive reports, and automated record keeping" />
      </Helmet>

      <div className="min-h-screen bg-background">
        

        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1679316481049-4f6549df499f" 
              alt="Professional training classroom with modern technology" 
              className="w-full h-full object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-gray-100/50"></div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6" style={{ letterSpacing: '-0.02em' }}>
                Modern Training Management System
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
                Track attendance, manage trainees, and generate comprehensive reports with real-time monitoring and automated workflows
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/login">Access Admin Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6">
                  <a href="#features">Explore Features</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
                Everything you need for training management
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built for organizations that demand precision, efficiency, and real-time insights
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                    <CardHeader>
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ letterSpacing: '-0.02em' }}>
                Ready to transform your training operations?
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Join organizations using our platform to streamline training management and improve outcomes
              </p>
              <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
                <Link to="/login">Get Started Now</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        <footer className="py-12 bg-secondary text-secondary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm">© 2026 Training Monitoring System. All rights reserved.</p>
              <div className="flex gap-6">
                <Link to="#" className="text-sm hover:underline">Privacy Policy</Link>
                <Link to="#" className="text-sm hover:underline">Terms of Service</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomePage;