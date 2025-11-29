import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar, Clock, Star, Users, Shield, TrendingUp } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src={strandsLogo} alt="Strands" className="w-20 h-20" />
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button id="get-started-header-button" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <Badge className="mb-4" variant="outline">
            #1 Salon Booking Platform
          </Badge>
          <h1 className="text-4xl md:text-6xl mb-6">
            Streamline Your Salon Operations
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Complete booking platform for salons, stylists, and customers. Manage appointments, 
            payments, staff, and grow your business with powerful analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/login')}>
              Sign In Now
            </Button>
            <Button id="get-started-hero-button" size="lg" variant="outline" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl mb-4">Everything You Need to Run Your Salon</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From appointment booking to staff management, we've got all the tools to help your salon thrive.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Calendar className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Smart Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                24/7 online booking with real-time availability, automated reminders, and easy rescheduling.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Staff Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage employee schedules, working hours, time blocks, and track performance metrics.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Business Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Comprehensive reports on revenue, customer retention, staff performance, and growth insights.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Star className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Built-in review system with loyalty programs to keep customers coming back.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Secure Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Integrated payment processing with history tracking and automated invoicing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Time Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Flexible scheduling with configurable time slots and automatic conflict detection.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* User Types Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-4">Built for Everyone</h2>
            <p className="text-muted-foreground">
              Different interfaces for different needs - customers, salon owners, stylists, and administrators.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="mb-2">Customers</h3>
              <p className="text-sm text-muted-foreground">
                Easy booking, payment history, loyalty rewards, and reviews
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="mb-2">Salon Owners</h3>
              <p className="text-sm text-muted-foreground">
                Manage staff, services, schedules, and business analytics
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="mb-2">Stylists</h3>
              <p className="text-sm text-muted-foreground">
                View schedules, client history, take photos, track payments
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="mb-2">Administrators</h3>
              <p className="text-sm text-muted-foreground">
                Platform oversight, salon verification, analytics dashboard
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl mb-4">Ready to Transform Your Salon?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of salons already using Strands to streamline their operations and grow their business.
          </p>
          <Button size="lg" onClick={() => navigate('/login')}>
            Sign In Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Strands. Built for salon professionals everywhere.</p>
        </div>
      </footer>
    </div>
  );
}