// @ts-nocheck
import { Command } from '@m5nv/create-scaffold/lib/cli/command.mts';
import { hintsHelp } from './help.mts';

export class HintsCommand extends Command {
  constructor() {
    super(hintsHelp);
  }

  parseArg(_arg, _args, _i, _parsed) {
    // No arguments for hints command
  }

  run(_parsed) {
    console.log('📋 Available Hints Catalog for Template Authoring');
    console.log('==================================================');
    console.log();
    console.log('💡 Feature Hints:');
    console.log();

    const hints = [
      {
        id: 'auth',
        label: 'Authentication',
        description: 'User authentication and authorization systems',
        examples: ['Google OAuth', 'GitHub OAuth', 'JWT tokens', 'Session management']
      },
      {
        id: 'database',
        label: 'Database',
        description: 'Data storage and retrieval systems',
        examples: ['SQLite', 'PostgreSQL', 'MongoDB', 'Redis caching']
      },
      {
        id: 'api',
        label: 'API Design',
        description: 'RESTful API endpoints and GraphQL schemas',
        examples: ['REST API', 'GraphQL', 'OpenAPI specs', 'Rate limiting']
      },
      {
        id: 'ui',
        label: 'User Interface',
        description: 'Frontend frameworks and UI components',
        examples: ['React', 'Vue.mts', 'Svelte', 'Tailwind CSS', 'Material UI']
      },
      {
        id: 'storage',
        label: 'File Storage',
        description: 'File upload, storage, and CDN solutions',
        examples: ['AWS S3', 'Cloudflare R2', 'Local file system', 'Image optimization']
      },
      {
        id: 'payments',
        label: 'Payment Processing',
        description: 'Payment gateways and subscription management',
        examples: ['Stripe', 'PayPal', 'Subscription billing', 'Webhooks']
      },
      {
        id: 'analytics',
        label: 'Analytics & Tracking',
        description: 'User analytics and event tracking',
        examples: ['Google Analytics', 'Mixpanel', 'Custom dashboards', 'Privacy compliance']
      },
      {
        id: 'email',
        label: 'Email Services',
        description: 'Transactional and marketing email systems',
        examples: ['SendGrid', 'Mailgun', 'Email templates', 'Bounce handling']
      },
      {
        id: 'admin',
        label: 'Admin Interface',
        description: 'Administrative dashboards and CMS',
        examples: ['Admin panels', 'Content management', 'User management', 'Audit logs']
      },
      {
        id: 'testing',
        label: 'Testing Frameworks',
        description: 'Unit, integration, and end-to-end testing',
        examples: ['Jest', 'Cypress', 'Playwright', 'Test coverage', 'CI testing']
      },
      {
        id: 'ci-cd',
        label: 'CI/CD Pipelines',
        description: 'Continuous integration and deployment',
        examples: ['GitHub Actions', 'GitLab CI', 'Docker', 'Automated deployments']
      },
      {
        id: 'monitoring',
        label: 'Monitoring & Logging',
        description: 'Application monitoring and error tracking',
        examples: ['Sentry', 'DataDog', 'Custom logging', 'Performance monitoring']
      },
      {
        id: 'security',
        label: 'Security Features',
        description: 'Security best practices and implementations',
        examples: ['HTTPS', 'CSRF protection', 'Input validation', 'Security headers']
      },
      {
        id: 'docs',
        label: 'Documentation',
        description: 'API docs, user guides, and developer resources',
        examples: ['OpenAPI docs', 'README files', 'Changelogs', 'Contributing guides']
      },
      {
        id: 'i18n',
        label: 'Internationalization',
        description: 'Multi-language support and localization',
        examples: ['i18next', 'React Intl', 'Date formatting', 'Currency handling']
      }
    ];

    hints.forEach(hint => {
      console.log(`• ${hint.label} (${hint.id})`);
      console.log(`  ${hint.description}`);
      if (hint.examples && hint.examples.length > 0) {
        console.log(`  Examples: ${hint.examples.join(', ')}`);
      }
      console.log();
    });

    console.log('💡 Use them in your template.json under hints.features to help users understand');
    console.log('   what features your template provides and how to configure them.');
    console.log();
    console.log('💡 Each hint should include:');
    console.log('   • id: Unique identifier');
    console.log('   • label: Display name');
    console.log('   • description: What it does');
    console.log('   • needs: Required dependencies (database, auth, payments, storage)');
  }
}
