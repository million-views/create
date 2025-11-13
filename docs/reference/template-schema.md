------

title: "Template Schema Reference"title: "Template Schema Reference"

type: "reference"type: "reference"

audience: "template-authors"audience: "template-authors"

estimated_time: "10 minutes"estimated_time: "10 minutes"

prerequisites:prerequisites:

  - "Read reference/environment.md"  - "Read reference/environment.md"

  - "Read how-to/creating-templates.md"  - "Read how-to/creating-templates.md"

related_docs:related_docs:

  - "../how-to/creating-templates.md"  - "../how-to/creating-templates.md"

  - "environment.md"  - "environment.md"

  - "../how-to/author-workflow.md"  - "../how-to/author-workflow.md"

last_updated: "2025-11-13"last_updated: "2025-11-13"

------



# Template Schema Reference# Template Schema Reference



Complete reference for Schema V1.0 (`template.json`). This document covers all sections of the template schema including metadata, setup configuration, feature specifications, hints, and constants.Complete reference for Schema V1.0 (`template.json`). This document covers all sections of the template schema including metadata, setup configuration, feature specifications, hints, and constants.



## Overview## Overview



Schema V1.0 defines the structure for `template.json` files. Templates are validated against this schema during creation and runtime. The schema ensures consistent behavior across all templates while allowing flexibility for different use cases.Schema V1.0 defines the structure for `template.json` files. Templates are validated against this schema during creation and runtime. The schema ensures consistent behavior across all templates while allowing flexibility for different use cases.



## Schema Structure## Schema Structure



```json```json

{{

  "schemaVersion": "1.0.0",  "schemaVersion": "1.0.0",

  "title": "My Template",  "title": "My Template",

  "id": "my-template",  "id": "my-template",

  "name": "My Template",  "name": "My Template",

  "description": "A template for building X",  "description": "A template for building X",

  "setup": {  "setup": {

    "authoringMode": "composable",    "authoringMode": "composable",

    "policy": "strict",    "policy": "strict",

    "dimensions": { /* required dimensions */ },    "dimensions": { /* required dimensions */ },

    "gates": { /* compatibility rules */ }    "gates": { /* compatibility rules */ }

  },  },

  "featureSpecs": { /* feature definitions */ },  "featureSpecs": { /* feature definitions */ },

  "hints": { /* advisory feature catalog */ },  "hints": { /* advisory feature catalog */ },

  "constants": { /* fixed template values */ }  "constants": { /* fixed template values */ }

}}

``````



## Top-Level Properties## Top-Level Properties



| Property | Type | Required | Description || Property | Type | Required | Description |

|----------|------|----------|-------------||----------|------|----------|-------------|

| `schemaVersion` | `string` | No | Schema version (currently "1.0.0") || `schemaVersion` | `string` | No | Schema version (currently "1.0.0") |

| `title` | `string` | No | Human-readable title || `title` | `string` | No | Human-readable title |

| `id` | `string` | No | Unique template identifier || `id` | `string` | No | Unique template identifier |

| `name` | `string` | No | Short template name || `name` | `string` | No | Short template name |

| `description` | `string` | No | Template description || `description` | `string` | No | Template description |



### Required Sections### Required Sections



| Property | Type | Description || Property | Type | Description |

|----------|------|-------------||----------|------|-------------|

| `setup` | `object` | Template configuration and dimensions || `setup` | `object` | Template configuration and dimensions |

| `featureSpecs` | `object` | Feature definitions with requirements || `featureSpecs` | `object` | Feature definitions with requirements |

| `constants` | `object` | Fixed template constants || `constants` | `object` | Fixed template constants |



## Setup Section## Setup Section



The `setup` section configures template behavior and defines user-selectable options.The `setup` section configures template behavior and defines user-selectable options.



### Setup Properties### Setup Properties



| Property | Type | Required | Description || Property | Type | Required | Description |

|----------|------|----------|-------------||----------|------|----------|-------------|

| `authoringMode` | `string` | No | `"composable"` or `"fixed"` (default: `"composable"`) || `authoringMode` | `string` | No | `"composable"` or `"fixed"` (default: `"composable"`) |

| `policy` | `string` | Yes | `"strict"` or `"lenient"` validation || `policy` | `string` | Yes | `"strict"` or `"lenient"` validation |

| `dimensions` | `object` | Yes | User-selectable options || `dimensions` | `object` | Yes | User-selectable options |

| `gates` | `object` | Yes | Compatibility constraints || `gates` | `object` | Yes | Compatibility constraints |



### Authoring Modes### Authoring Modes



- **`composable`**: Features assembled via `_setup.mjs` (recommended)- **`composable`**: Features assembled via `_setup.mjs` (recommended)

- **`fixed`**: Pre-built combinations, limited customization- **`fixed`**: Pre-built combinations, limited customization



### Validation Policies### Validation Policies



- **`strict`**: Reject invalid selections (recommended for production)- **`strict`**: Reject invalid selections (recommended for production)

- **`lenient`**: Allow unknown values with warnings (development only)- **`lenient`**: Allow unknown values with warnings (development only)



## Dimensions## Dimensions



Dimensions define user-selectable options. Schema V1.0 requires exactly 7 dimensions.Dimensions define user-selectable options. Schema V1.0 requires exactly 7 dimensions.



### Required Dimensions### Required Dimensions



All templates must define these dimensions:All templates must define these dimensions:



| Name | Type | Purpose || Name | Type | Purpose |

|------|------|---------||------|------|---------|

| `deployment_target` | `single` | Deployment platform || `deployment_target` | `single` | Deployment platform |

| `features` | `multi` | Custom feature toggles || `features` | `multi` | Custom feature toggles |

| `database` | `single` | Database technology choice || `database` | `single` | Database technology choice |

| `storage` | `single` | Storage solution || `storage` | `single` | Storage solution |

| `auth_providers` | `multi` | Authentication providers || `auth_providers` | `multi` | Authentication providers |

| `payments` | `single` | Payment processor || `payments` | `single` | Payment processor |

| `analytics` | `single` | Analytics service || `analytics` | `single` | Analytics service |



### Dimension Types### Dimension Types



- **`single`**: User selects exactly one value from allowed options- **`single`**: User selects exactly one value from allowed options

- **`multi`**: User selects zero or more values from allowed options- **`multi`**: User selects zero or more values from allowed options



### Dimension Schema### Dimension Schema



```json```json

{{

  "dimension_name": {  "dimension_name": {

    "type": "single|multi",    "type": "single|multi",

    "values": ["option1", "option2"],    "values": ["option1", "option2"],

    "default": "option1" // or ["option1", "option2"] for multi    "default": "option1" // or ["option1", "option2"] for multi

  }  }

}}

``````



## Dimension Details## Dimension Details



### deployment_target### deployment_target



**Type:** `single` (required)**Type:** `single` (required)



**Purpose:** Specifies the deployment platform and infrastructure target.**Purpose:** Specifies the deployment platform and infrastructure target.



**Allowed Values:****Allowed Values:**

- `cloudflare-workers` - Cloudflare Workers- `cloudflare-workers` - Cloudflare Workers

- `linode` - Linode platform- `linode` - Linode platform

- `droplet` - DigitalOcean Droplet- `droplet` - DigitalOcean Droplet

- `deno-deploy` - Deno Deploy- `deno-deploy` - Deno Deploy

- Custom values starting with `x-` (e.g., `x-custom-platform`)- Custom values starting with `x-` (e.g., `x-custom-platform`)



**Schema Example:****Schema Example:**

```json```json

{{

  "deployment_target": {  "deployment_target": {

    "type": "single",    "type": "single",

    "values": ["cloudflare-workers", "linode", "droplet"],    "values": ["cloudflare-workers", "linode", "droplet"],

    "default": "cloudflare-workers"    "default": "cloudflare-workers"

  }  }

}}

``````



### features### features



**Type:** `multi` (required)**Type:** `multi` (required)



**Purpose:** Custom feature toggles specific to your template.**Purpose:** Custom feature toggles specific to your template.



**Allowed Values:** Any string values you define**Allowed Values:** Any string values you define



**Schema Example:****Schema Example:**

```json```json

{{

  "features": {  "features": {

    "type": "multi",    "type": "multi",

    "values": ["auth", "testing", "i18n", "logging"],    "values": ["auth", "testing", "i18n", "logging"],

    "default": ["testing"]    "default": ["testing"]

  }  }

}}

``````



### database### database



**Type:** `single` (required)**Type:** `single` (required)



**Purpose:** Database technology choice.**Purpose:** Database technology choice.



**Allowed Values:****Allowed Values:**

- `d1` - Cloudflare D1- `d1` - Cloudflare D1

- `tursodb` - TursoDB- `tursodb` - TursoDB

- `sqlite3` - SQLite3- `sqlite3` - SQLite3

- `none` - No database- `none` - No database



**Schema Example:****Schema Example:**

```json```json

{{

  "database": {  "database": {

    "type": "single",    "type": "single",

    "values": ["d1", "tursodb", "sqlite3", "none"],    "values": ["d1", "tursodb", "sqlite3", "none"],

    "default": "none"    "default": "none"

  }  }

}}

``````



### storage### storage



**Type:** `single` (required)**Type:** `single` (required)



**Purpose:** Storage solution for files and assets.**Purpose:** Storage solution for files and assets.



**Allowed Values:****Allowed Values:**

- `r2` - Cloudflare R2- `r2` - Cloudflare R2

- `s3` - Amazon S3- `s3` - Amazon S3

- `file` - Local file system- `file` - Local file system

- `none` - No storage- `none` - No storage



**Schema Example:****Schema Example:**

```json```json

{{

  "storage": {  "storage": {

    "type": "single",    "type": "single",

    "values": ["r2", "s3", "file", "none"],    "values": ["r2", "s3", "file", "none"],

    "default": "none"    "default": "none"

  }  }

}}

``````



### auth_providers### auth_providers



**Type:** `multi` (required)**Type:** `multi` (required)



**Purpose:** Authentication providers for user login.**Purpose:** Authentication providers for user login.



**Allowed Values:****Allowed Values:**

- `google` - Google OAuth- `google` - Google OAuth

- `github` - GitHub OAuth- `github` - GitHub OAuth

- Custom values starting with `x-`- Custom values starting with `x-`



**Schema Example:****Schema Example:**

```json```json

{{

  "auth_providers": {  "auth_providers": {

    "type": "multi",    "type": "multi",

    "values": ["google", "github"],    "values": ["google", "github"],

    "default": []    "default": []

  }  }

}}

``````



### payments### payments



**Type:** `single` (required)**Type:** `single` (required)



**Purpose:** Payment processor for monetization.**Purpose:** Payment processor for monetization.



**Allowed Values:****Allowed Values:**

- `stripe` - Stripe payments- `stripe` - Stripe payments

- `hyperswitch` - Hyperswitch- `hyperswitch` - Hyperswitch

- `none` - No payments- `none` - No payments



**Schema Example:****Schema Example:**

```json```json

{{

  "payments": {  "payments": {

    "type": "single",    "type": "single",

    "values": ["stripe", "hyperswitch", "none"],    "values": ["stripe", "hyperswitch", "none"],

    "default": "none"    "default": "none"

  }  }

}}

``````



### analytics### analytics



**Type:** `single` (required)**Type:** `single` (required)



**Purpose:** Analytics service for tracking.**Purpose:** Analytics service for tracking.



**Allowed Values:****Allowed Values:**

- `umami` - Umami Analytics- `umami` - Umami Analytics

- `plausible` - Plausible Analytics- `plausible` - Plausible Analytics

- `none` - No analytics- `none` - No analytics



**Schema Example:****Schema Example:**

```json```json

{{

  "analytics": {  "analytics": {

    "type": "single",    "type": "single",

    "values": ["umami", "plausible", "none"],    "values": ["umami", "plausible", "none"],

    "default": "none"    "default": "none"

  }  }

}}

``````



## Gates## Gates



Gates define compatibility constraints between dimension values. They prevent invalid combinations during template creation.Gates define compatibility constraints between dimension values. They prevent invalid combinations during template creation.



### Gate Schema### Gate Schema



```json```json

{{

  "gates": {  "gates": {

    "dimension_name": {    "dimension_name": {

      "value": {      "value": {

        "requires|conflicts": {        "requires|conflicts": {

          "other_dimension": ["allowed_values"]          "other_dimension": ["allowed_values"]

        }        }

      }      }

    }    }

  }  }

}}

``````



### Gate Types### Gate Types



- **`requires`**: When this value is selected, other dimensions must have specific values- **`requires`**: When this value is selected, other dimensions must have specific values

- **`conflicts`**: When this value is selected, other dimensions cannot have specific values- **`conflicts`**: When this value is selected, other dimensions cannot have specific values



### Gate Examples### Gate Examples



```json```json

{{

  "gates": {  "gates": {

    "deployment_target": {    "deployment_target": {

      "cloudflare-workers": {      "cloudflare-workers": {

        "requires": {        "requires": {

          "database": ["d1"],          "database": ["d1"],

          "storage": ["r2"]          "storage": ["r2"]

        }        }

      }      }

    },    },

    "database": {    "database": {

      "d1": {      "d1": {

        "requires": {        "requires": {

          "deployment_target": ["cloudflare-workers"]          "deployment_target": ["cloudflare-workers"]

        }        }

      }      }

    }    }

  }  }

}}

``````



## FeatureSpecs## FeatureSpecs



FeatureSpecs define available features and their requirements. Each feature specifies what capabilities it needs from the selected dimensions.FeatureSpecs define available features and their requirements. Each feature specifies what capabilities it needs from the selected dimensions.



### FeatureSpec Schema### FeatureSpec Schema



```json```json

{{

  "featureSpecs": {  "featureSpecs": {

    "feature_name": {    "feature_name": {

      "label": "Human readable name",      "label": "Human readable name",

      "description": "Feature description",      "description": "Feature description",

      "needs": {      "needs": {

        "dimension_name": "required|optional|none"        "dimension_name": "required|optional|none"

      }      }

    }    }

  }  }

}}

``````



### Needs Values### Needs Values



- **`required`**: Feature requires this capability to be available- **`required`**: Feature requires this capability to be available

- **`optional`**: Feature can use this capability if available- **`optional`**: Feature can use this capability if available

- **`none`**: Feature doesn't use this capability- **`none`**: Feature doesn't use this capability



### FeatureSpec Example### FeatureSpec Example



```json```json

{{

  "featureSpecs": {  "featureSpecs": {

    "auth": {    "auth": {

      "label": "Authentication",      "label": "Authentication",

      "description": "User authentication and session management",      "description": "User authentication and session management",

      "needs": {      "needs": {

        "auth_providers": "required",        "auth_providers": "required",

        "database": "required"        "database": "required"

      }      }

    },    },

    "payments": {    "payments": {

      "label": "Payment Processing",      "label": "Payment Processing",

      "description": "Accept and process payments",      "description": "Accept and process payments",

      "needs": {      "needs": {

        "payments": "required",        "payments": "required",

        "database": "required"        "database": "required"

      }      }

    }    }

  }  }

}}

``````



## Hints## Hints



Hints provide an advisory catalog of recommended features for different use cases. They're used by the CLI to suggest features during template creation.Hints provide an advisory catalog of recommended features for different use cases. They're used by the CLI to suggest features during template creation.



### Hints Schema### Hints Schema



```json```json

{{

  "hints": {  "hints": {

    "category_name": {    "category_name": {

      "label": "Category display name",      "label": "Category display name",

      "description": "Category description",      "description": "Category description",

      "features": ["feature1", "feature2"]      "features": ["feature1", "feature2"]

    }    }

  }  }

}}

``````



### Hints Example### Hints Example



```json```json

{{

  "hints": {  "hints": {

    "web-app": {    "web-app": {

      "label": "Web Application",      "label": "Web Application",

      "description": "Features for building web applications",      "description": "Features for building web applications",

      "features": ["auth", "database", "analytics"]      "features": ["auth", "database", "analytics"]

    },    },

    "api": {    "api": {

      "label": "API Service",      "label": "API Service",

      "description": "Features for building APIs",      "description": "Features for building APIs",

      "features": ["auth", "database", "logging"]      "features": ["auth", "database", "logging"]

    }    }

  }  }

}}

``````



## Constants## Constants



Constants define fixed values that templates can reference. These are typically tooling versions, framework choices, or other immutable template settings.Constants define fixed values that templates can reference. These are typically tooling versions, framework choices, or other immutable template settings.



### Constants Schema### Constants Schema



```json```json

{{

  "constants": {  "constants": {

    "typescript": "5.3.0",    "typescript": "5.3.0",

    "react": "18.2.0",    "react": "18.2.0",

    "tailwindcss": "3.4.0"    "tailwindcss": "3.4.0"

  }  }

}}

``````



### Common Constants### Common Constants



```json```json

{{

  "constants": {  "constants": {

    "typescript": "5.3.0",    "typescript": "5.3.0",

    "react-router-v7": "7.0.0",    "react-router-v7": "7.0.0",

    "tailwind+daisyui": "3.4.0+4.6.0",    "tailwind+daisyui": "3.4.0+4.6.0",

    "vitest": "1.0.0",    "vitest": "1.0.0",

    "eslint": "8.50.0"    "eslint": "8.50.0"

  }  }

}}

``````



## Complete Example## Complete Example



```json```json

{{

  "schemaVersion": "1.0.0",  "schemaVersion": "1.0.0",

  "title": "Full-Stack Web App Template",  "title": "Full-Stack Web App Template",

  "id": "fullstack-webapp",  "id": "fullstack-webapp",

  "name": "Full-Stack Web App",  "name": "Full-Stack Web App",

  "description": "A complete web application with authentication, database, and payments",  "description": "A complete web application with authentication, database, and payments",

  "setup": {  "setup": {

    "authoringMode": "composable",    "authoringMode": "composable",

    "policy": "strict",    "policy": "strict",

    "dimensions": {    "dimensions": {

      "deployment_target": {      "deployment_target": {

        "type": "single",        "type": "single",

        "values": ["cloudflare-workers", "linode", "droplet"],        "values": ["cloudflare-workers", "linode", "droplet"],

        "default": "cloudflare-workers"        "default": "cloudflare-workers"

      },      },

      "features": {      "features": {

        "type": "multi",        "type": "multi",

        "values": ["auth", "payments", "analytics", "testing"],        "values": ["auth", "payments", "analytics", "testing"],

        "default": ["testing"]        "default": ["testing"]

      },      },

      "database": {      "database": {

        "type": "single",        "type": "single",

        "values": ["d1", "tursodb", "sqlite3", "none"],        "values": ["d1", "tursodb", "sqlite3", "none"],

        "default": "d1"        "default": "d1"

      },      },

      "storage": {      "storage": {

        "type": "single",        "type": "single",

        "values": ["r2", "s3", "file", "none"],        "values": ["r2", "s3", "file", "none"],

        "default": "r2"        "default": "r2"

      },      },

      "auth_providers": {      "auth_providers": {

        "type": "multi",        "type": "multi",

        "values": ["google", "github"],        "values": ["google", "github"],

        "default": []        "default": []

      },      },

      "payments": {      "payments": {

        "type": "single",        "type": "single",

        "values": ["stripe", "hyperswitch", "none"],        "values": ["stripe", "hyperswitch", "none"],

        "default": "none"        "default": "none"

      },      },

      "analytics": {      "analytics": {

        "type": "single",        "type": "single",

        "values": ["umami", "plausible", "none"],        "values": ["umami", "plausible", "none"],

        "default": "none"        "default": "none"

      }      }

    },    },

    "gates": {    "gates": {

      "deployment_target": {      "deployment_target": {

        "cloudflare-workers": {        "cloudflare-workers": {

          "requires": {          "requires": {

            "database": ["d1"],            "database": ["d1"],

            "storage": ["r2"]            "storage": ["r2"]

          }          }

        }        }

      }      }

    }    }

  },  },

  "featureSpecs": {  "featureSpecs": {

    "auth": {    "auth": {

      "label": "Authentication",      "label": "Authentication",

      "description": "User authentication and session management",      "description": "User authentication and session management",

      "needs": {      "needs": {

        "auth_providers": "required",        "auth_providers": "required",

        "database": "required"        "database": "required"

      }      }

    },    },

    "payments": {    "payments": {

      "label": "Payment Processing",      "label": "Payment Processing",

      "description": "Accept and process payments",      "description": "Accept and process payments",

      "needs": {      "needs": {

        "payments": "required",        "payments": "required",

        "database": "required"        "database": "required"

      }      }

    },    },

    "analytics": {    "analytics": {

      "label": "Analytics",      "label": "Analytics",

      "description": "Track user behavior and app metrics",      "description": "Track user behavior and app metrics",

      "needs": {      "needs": {

        "analytics": "required"        "analytics": "required"

      }      }

    },    },

    "testing": {    "testing": {

      "label": "Testing Suite",      "label": "Testing Suite",

      "description": "Unit and integration tests",      "description": "Unit and integration tests",

      "needs": {}      "needs": {}

    }    }

  },  },

  "hints": {  "hints": {

    "minimal": {    "minimal": {

      "label": "Minimal App",      "label": "Minimal App",

      "description": "Basic web app with testing",      "description": "Basic web app with testing",

      "features": ["testing"]      "features": ["testing"]

    },    },

    "fullstack": {    "fullstack": {

      "label": "Full-Stack App",      "label": "Full-Stack App",

      "description": "Complete application with all features",      "description": "Complete application with all features",

      "features": ["auth", "payments", "analytics", "testing"]      "features": ["auth", "payments", "analytics", "testing"]

    }    }

  },  },

  "constants": {  "constants": {

    "typescript": "5.3.0",    "typescript": "5.3.0",

    "react-router-v7": "7.0.0",    "react-router-v7": "7.0.0",

    "tailwind+daisyui": "3.4.0+4.6.0",    "tailwind+daisyui": "3.4.0+4.6.0",

    "vitest": "1.0.0",    "vitest": "1.0.0",

    "eslint": "8.50.0"    "eslint": "8.50.0"

  }  }

}}

``````



## Migration from Earlier Versions## Migration from Earlier Versions



If you're updating from templates without the full schema:If you're updating from templates without the full schema:



1. Add the 7 required dimensions to `setup.dimensions`1. Add the 7 required dimensions to `setup.dimensions`

2. Add `gates` object (can be empty `{}`)2. Add `gates` object (can be empty `{}`)

3. Add `featureSpecs` with definitions for your features3. Add `featureSpecs` with definitions for your features

4. Add `constants` with your fixed tooling versions4. Add `constants` with your fixed tooling versions

5. Optionally add `hints` for better user experience5. Optionally add `hints` for better user experience



## Validation## Validation



Templates are validated against Schema V1.0 during:Templates are validated against Schema V1.0 during:

- Template creation (`create-scaffold new`)- Template creation (`create-scaffold new`)

- Template validation (`make-template validate`)- Template validation (`make-template validate`)

- Runtime setup execution- Runtime setup execution



Validation ensures all required dimensions are present and values conform to allowed options.Validation ensures all required dimensions are present and values conform to allowed options.jsonAll templates must define these seven dimensions in `setup.dimensions`:

{

  "schemaVersion": "1.0.0",| Name | Type | Description |

  "title": "My Template",|------|------|-------------|

  "id": "my-template",| `deployment_target` | `single` | Deployment platform (cloudflare-workers, linode, droplet, deno-deploy, or custom x- prefixed values) |

  "name": "My Template",| `features` | `multi` | Custom feature toggles (any string values) |

  "description": "A template for building X",| `database` | `single` | Database choice (d1, tursodb, sqlite3, none) |

| `storage` | `single` | Storage solution (r2, s3, file, none) |

  "setup": {| `auth_providers` | `multi` | Authentication providers (google, github) |

    "authoringMode": "composable",| `payments` | `single` | Payment processor (stripe, hyperswitch, none) |

    "policy": "strict",| `analytics` | `single` | Analytics service (umami, plausible, none) |

    "dimensions": { /* required dimensions */ },

    "gates": { /* compatibility rules */ }## Dimension Details

  },

### deployment_target

  "featureSpecs": { /* feature definitions */ },

  "hints": { /* advisory feature catalog */ },**Type:** `single` (required)  

  "constants": { /* fixed template values */ }**Purpose:** Specifies the deployment platform and infrastructure target.

}

```**Allowed Values:**

- `cloudflare-workers` - Cloudflare Workers

## Top-Level Properties- `linode` - Linode platform

- `droplet` - DigitalOcean Droplet

### Metadata Properties- `deno-deploy` - Deno Deploy

- Custom values starting with `x-` (e.g., `x-custom-platform`)

| Property | Type | Required | Description |

|----------|------|----------|-------------|**Schema Example:**

| `schemaVersion` | `string` | No | Schema version (currently "1.0.0") |```json

| `title` | `string` | No | Human-readable title |{

| `id` | `string` | No | Unique template identifier |  "deployment_target": {

| `name` | `string` | No | Short template name |    "type": "single",

| `description` | `string` | No | Template description |    "values": ["cloudflare-workers", "linode", "droplet"],

    "default": "cloudflare-workers"

### Required Sections  }

}

| Property | Type | Description |```

|----------|------|-------------|

| `setup` | `object` | Template configuration and dimensions |### features

| `featureSpecs` | `object` | Feature definitions with requirements |

| `constants` | `object` | Fixed template constants |**Type:** `multi` (required)  

**Purpose:** Custom feature toggles specific to your template.

## Setup Section

**Allowed Values:** Any string values you define

The `setup` section configures template behavior and defines user-selectable options.

**Schema Example:**

### Setup Properties```json

{

| Property | Type | Required | Description |  "features": {

|----------|------|----------|-------------|    "type": "multi",

| `authoringMode` | `string` | No | `"composable"` or `"fixed"` (default: `"composable"`) |    "values": ["auth", "testing", "i18n", "logging"],

| `policy` | `string` | Yes | `"strict"` or `"lenient"` validation |    "default": ["testing"]

| `dimensions` | `object` | Yes | User-selectable options |  }

| `gates` | `object` | Yes | Compatibility constraints |}

```

### Authoring Modes

### database

- **`composable`**: Features assembled via `_setup.mjs` (recommended)

- **`fixed`**: Pre-built combinations, limited customization**Type:** `single` (required)  

**Purpose:** Database technology choice.

### Validation Policies

**Allowed Values:**

- **`strict`**: Reject invalid selections (recommended for production)- `d1` - Cloudflare D1

- **`lenient`**: Allow unknown values with warnings (development only)- `tursodb` - TursoDB

- `sqlite3` - SQLite3

## Dimensions- `none` - No database



Dimensions define user-selectable options. Schema V1.0 requires exactly 7 dimensions.**Schema Example:**

```json

### Required Dimensions{

  "database": {

All templates must define these dimensions:    "type": "single",

    "values": ["d1", "tursodb", "sqlite3", "none"],

| Name | Type | Purpose |    "default": "none"

|------|------|---------|  }

| `deployment_target` | `single` | Deployment platform |}

| `features` | `multi` | Feature toggles |```

| `database` | `single` | Database choice |

| `storage` | `single` | Storage solution |### storage

| `auth_providers` | `multi` | Authentication providers |

| `payments` | `single` | Payment processor |**Type:** `single` (required)  

| `analytics` | `single` | Analytics service |**Purpose:** File/object storage solution.



### Dimension Schema**Allowed Values:**

- `r2` - Cloudflare R2

Each dimension follows this structure:- `s3` - Amazon S3

- `file` - Local file system

```json- `none` - No storage

{

  "dimension_name": {**Schema Example:**

    "type": "single|multi",```json

    "values": ["option1", "option2"],{

    "default": "default_value" | [],  "storage": {

    "ui": { /* optional UI hints */ }    "type": "single",

  }    "values": ["r2", "s3", "file", "none"],

}    "default": "none"

```  }

}

### deployment_target```



**Type:** `single` (required)  ### auth_providers

**Purpose:** Specifies the deployment platform and infrastructure target.

**Type:** `multi` (required)  

**Standard Values:****Purpose:** Authentication providers to configure.

- `cloudflare-workers` - Cloudflare Workers

- `linode` - Linode platform**Allowed Values:**

- `droplet` - DigitalOcean Droplet- `google` - Google OAuth

- `deno-deploy` - Deno Deploy- `github` - GitHub OAuth



**Custom Values:** Start with `x-` (e.g., `x-custom-platform`)**Schema Example:**

```json

**Schema Example:**{

```json  "auth_providers": {

{    "type": "multi",

  "deployment_target": {    "values": ["google", "github"],

    "type": "single",    "default": []

    "values": ["cloudflare-workers", "linode", "droplet"],  }

    "default": "cloudflare-workers"}

  }```

}

```### payments



### features**Type:** `single` (required)  

**Purpose:** Payment processing service.

**Type:** `multi` (required)  

**Purpose:** Custom feature toggles specific to your template.**Allowed Values:**

- `stripe` - Stripe

**Allowed Values:** Any string values you define- `hyperswitch` - Hyperswitch

- `none` - No payments

**Schema Example:**

```json**Schema Example:**

{```json

  "features": {{

    "type": "multi",  "payments": {

    "values": ["auth", "testing", "logging"],    "type": "single",

    "default": ["testing"]    "values": ["stripe", "hyperswitch", "none"],

  }    "default": "none"

}  }

```}

```

### database

### analytics

**Type:** `single` (required)  

**Purpose:** Database technology choice.**Type:** `single` (required)  

**Purpose:** Analytics and tracking service.

**Allowed Values:**

- `d1` - Cloudflare D1**Allowed Values:**

- `tursodb` - TursoDB- `umami` - Umami Analytics

- `sqlite3` - SQLite3- `plausible` - Plausible Analytics

- `none` - No database- `none` - No analytics



**Schema Example:****Schema Example:**

```json```json

{{

  "database": {  "analytics": {

    "type": "single",    "type": "single",

    "values": ["d1", "tursodb", "sqlite3", "none"],    "values": ["umami", "plausible", "none"],

    "default": "none"    "default": "none"

  }  }

}}

``````



### storage## Dimension Types



**Type:** `single` (required)  ### Single-Select Dimensions

**Purpose:** File/object storage solution.

Users choose **one value** from a list. Required dimensions use this for mutually exclusive choices.

**Allowed Values:**

- `r2` - Cloudflare R2**Usage:**

- `s3` - Amazon S3```bash

- `file` - Local file systemnpm create @m5nv/scaffold my-app -- --template my-template --options "database=d1"

- `none` - No storage```



**Schema Example:**### Multi-Select Dimensions

```json

{Users choose **multiple values** from a list. Use `+` to combine values.

  "storage": {

    "type": "single",**Usage:**

    "values": ["r2", "s3", "file", "none"],```bash

    "default": "none"npm create @m5nv/scaffold my-app -- --template my-template --options "features=auth+testing"

  }```

}

```## Gates and Compatibility



### auth_providersTemplates use `setup.gates` to define which dimension combinations are valid for each deployment target.



**Type:** `multi` (required)  **Example Gates:**

**Purpose:** Authentication providers to configure.```json

{

**Allowed Values:**  "gates": {

- `google` - Google OAuth    "deployment_target": {

- `github` - GitHub OAuth      "cloudflare-workers": {

        "database": ["d1", "tursodb", "sqlite3"],

**Schema Example:**        "storage": ["r2"]

```json      },

{      "linode": {

  "auth_providers": {        "database": ["d1", "tursodb", "sqlite3"],

    "type": "multi",        "storage": ["s3", "file"]

    "values": ["google", "github"],      }

    "default": []    }

  }  }

}}

``````



### payments## Accessing Dimensions in Setup Scripts



**Type:** `single` (required)  Use `ctx.options.byDimension` to access selected values:

**Purpose:** Payment processing service.

```javascript

**Allowed Values:**// _setup.mjs

- `stripe` - Stripeexport default async function setup({ ctx, tools }) {

- `hyperswitch` - Hyperswitch  // Access required dimensions

- `none` - No payments  const deploymentTarget = ctx.options.byDimension.deployment_target;

  const features = ctx.options.byDimension.features || [];

**Schema Example:**  const database = ctx.options.byDimension.database;

```json  const storage = ctx.options.byDimension.storage;

{  const authProviders = ctx.options.byDimension.auth_providers || [];

  "payments": {  const payments = ctx.options.byDimension.payments;

    "type": "single",  const analytics = ctx.options.byDimension.analytics;

    "values": ["stripe", "hyperswitch", "none"],

    "default": "none"  // Use values to configure project

  }  if (tools.options.in('features', 'auth')) {

}    // Setup authentication

```  }



### analytics  if (database === 'd1') {

    // Configure D1 database

**Type:** `single` (required)    }

**Purpose:** Analytics and tracking service.}

```

**Allowed Values:**

- `umami` - Umami Analytics## Complete Template Schema Example

- `plausible` - Plausible Analytics

- `none` - No analytics```json

{

**Schema Example:**  "schemaVersion": "1.0.0",

```json  "title": "My Template",

{  "id": "my-template",

  "analytics": {  "description": "A template with all required dimensions",

    "type": "single",

    "values": ["umami", "plausible", "none"],  "setup": {

    "default": "none"    "dimensions": {

  }      "deployment_target": {

}        "type": "single",

```        "values": ["cloudflare-workers", "linode"],

        "default": "cloudflare-workers"

## Gates      },

      "features": {

Gates define compatibility constraints between dimension values.        "type": "multi",

        "values": ["auth", "testing", "logging"],

### Gate Structure        "default": ["testing"]

      },

```json      "database": {

{        "type": "single",

  "gates": {        "values": ["d1", "tursodb", "none"],

    "deployment_target": {        "default": "none"

      "cloudflare-workers": {      },

        "database": ["d1", "tursodb", "none"],      "storage": {

        "storage": ["r2", "none"]        "type": "single",

      },        "values": ["r2", "s3", "none"],

      "linode": {        "default": "none"

        "database": ["d1", "tursodb", "sqlite3"],      },

        "storage": ["s3", "file"]      "auth_providers": {

      }        "type": "multi",

    }        "values": ["google", "github"],

  }        "default": []

}      },

```      "payments": {

        "type": "single",

**Purpose:** Ensures only compatible combinations can be selected. For example, Cloudflare Workers can only use D1/Turso databases and R2 storage.        "values": ["stripe", "none"],

        "default": "none"

## FeatureSpecs      },

      "analytics": {

FeatureSpecs define individual features with their requirements and metadata.        "type": "single",

        "values": ["umami", "none"],

### FeatureSpec Structure        "default": "none"

      }

```json    },

{    "gates": {

  "featureSpecs": {      "deployment_target": {

    "my_feature": {        "cloudflare-workers": {

      "label": "My Feature",          "database": ["d1", "tursodb"],

      "description": "What this feature provides",          "storage": ["r2"]

      "needs": {        },

        "database": "required|optional|none",        "linode": {

        "auth": "required|optional|none",          "database": ["d1", "tursodb"],

        "payments": "required|optional|none",          "storage": ["s3"]

        "storage": "required|optional|none"        }

      }      }

    }    },

  }    "policy": "strict"

}  },

```

  "featureSpecs": {},

### FeatureSpec Properties  "constants": {}

}

| Property | Type | Required | Description |```

|----------|------|----------|-------------|

| `label` | `string` | Yes | Human-readable name (1-80 chars) |## Best Practices

| `description` | `string` | Yes | Feature description (1-280 chars) |

| `needs` | `object` | Yes | Capability requirements |1. **Always Define All Required Dimensions**: Schema validation will fail if any are missing

2. **Use Appropriate Defaults**: Provide sensible defaults for all dimensions

### Needs Requirements3. **Configure Gates**: Use gates to prevent invalid combinations

4. **Test All Combinations**: Verify your setup scripts work with all valid dimension combinations

Each `needs` property specifies how the feature relates to capabilities:5. **Document Your Template**: Explain what each dimension value does in your README



- **`required`**: Feature cannot work without this capability## IDE Support

- **`optional`**: Feature can use this capability if available

- **`none`**: Feature does not use this capabilityIDE customization is handled separately from dimensions. Use the `--ide` CLI flag and access via `ctx.ide` in setup scripts:



**Example:**```bash

```jsonnpm create @m5nv/scaffold my-app -- --template my-template --ide vscode

{```

  "featureSpecs": {

    "user_auth": {```javascript

      "label": "User Authentication",// _setup.mjs

      "description": "Allow users to sign up and log in",export default async function setup({ ctx, tools }) {

      "needs": {  const ide = ctx.ide; // 'vscode', 'cursor', etc.

        "database": "required",

        "auth": "none",  if (ide === 'vscode') {

        "payments": "none",    // Configure VS Code settings

        "storage": "optional"  }

      }}

    },```

    "file_upload": {

      "label": "File Upload",## Next Steps

      "description": "Allow users to upload files",

      "needs": {- **[Creating Templates](../how-to/creating-templates.md)** - Template authoring guide

        "database": "optional",- **[Environment Reference](environment.md)** - Setup script API

        "auth": "optional",- **[CLI Reference](cli-reference.md)** - Command usage including `--ide` flag

        "payments": "none",

        "storage": "required"## Related Documentation

      }

    }- [Getting Started Tutorial](../tutorial/getting-started.md) - First project walkthrough

  }- [create-scaffold Tutorial](../tutorial/create-scaffold.md) - Hands-on examples

}- [Author Workflow](../how-to/author-workflow.md) - Template development

```

## Hints

Hints provide an advisory catalog of common features that templates can reference.

### Hints Structure

```json
{
  "hints": {
    "features": [
      {
        "id": "feature_id",
        "label": "Feature Name",
        "description": "Feature description",
        "examples": ["Example 1", "Example 2"],
        "needs": {
          "database": "required|optional|none",
          "auth": "required|optional|none",
          "payments": "required|optional|none",
          "storage": "required|optional|none"
        }
      }
    ]
  }
}
```

**Purpose:** Hints are advisory only - they help template authors discover common patterns but don't enforce anything. Templates can define their own features in `featureSpecs` or reference hints.

## Constants

Constants define fixed values that don't change based on user selections.

### Required Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `language` | `"typescript"` | Programming language |
| `framework` | `"react-router-v7"` | Web framework |
| `styling` | `"tailwind+daisyui"` | CSS framework + component library |
| `ci_cd` | `"github-actions"` | CI/CD platform |
| `code_quality` | `"prettier"` | Code formatting tool |
| `transactional_emails` | `"gmail-org-service-account"` | Email service |

**Schema Example:**
```json
{
  "constants": {
    "language": "typescript",
    "framework": "react-router-v7",
    "styling": "tailwind+daisyui",
    "ci_cd": "github-actions",
    "code_quality": "prettier",
    "transactional_emails": "gmail-org-service-account"
  }
}
```

**Purpose:** Constants ensure consistent tooling across all templates while allowing setup scripts to access these values via `ctx.constants`.

## Complete Example

```json
{
  "schemaVersion": "1.0.0",
  "title": "React Router v7 Cloud App",
  "id": "rrv7-cloud-app",
  "name": "RRv7 Cloud App",
  "description": "Full-stack React Router v7 application with selectable features",

  "setup": {
    "authoringMode": "composable",
    "policy": "strict",
    "dimensions": {
      "deployment_target": {
        "type": "single",
        "values": ["cloudflare-workers", "linode"],
        "default": "cloudflare-workers"
      },
      "features": {
        "type": "multi",
        "values": ["auth", "testing", "logging"],
        "default": ["testing"]
      },
      "database": {
        "type": "single",
        "values": ["d1", "tursodb", "none"],
        "default": "none"
      },
      "storage": {
        "type": "single",
        "values": ["r2", "s3", "none"],
        "default": "none"
      },
      "auth_providers": {
        "type": "multi",
        "values": ["google", "github"],
        "default": []
      },
      "payments": {
        "type": "single",
        "values": ["stripe", "none"],
        "default": "none"
      },
      "analytics": {
        "type": "single",
        "values": ["umami", "none"],
        "default": "none"
      }
    },
    "gates": {
      "deployment_target": {
        "cloudflare-workers": {
          "database": ["d1", "tursodb"],
          "storage": ["r2"]
        },
        "linode": {
          "database": ["d1", "tursodb", "sqlite3"],
          "storage": ["s3", "file"]
        }
      }
    }
  },

  "featureSpecs": {
    "auth": {
      "label": "Authentication",
      "description": "User signup and login functionality",
      "needs": {
        "database": "required",
        "auth": "none",
        "payments": "none",
        "storage": "optional"
      }
    },
    "file_upload": {
      "label": "File Upload",
      "description": "Allow users to upload and manage files",
      "needs": {
        "database": "optional",
        "auth": "optional",
        "payments": "none",
        "storage": "required"
      }
    }
  },

  "hints": {
    "features": [
      {
        "id": "public_static",
        "label": "Public Static",
        "description": "Static marketing pages (no forms)",
        "needs": {
          "database": "none",
          "auth": "none",
          "payments": "none",
          "storage": "none"
        },
        "examples": ["Legal Pages", "About Us"]
      }
    ]
  },

  "constants": {
    "language": "typescript",
    "framework": "react-router-v7",
    "styling": "tailwind+daisyui",
    "ci_cd": "github-actions",
    "code_quality": "prettier",
    "transactional_emails": "gmail-org-service-account"
  }
}
```

## IDE Support

IDE customization is handled separately from dimensions. Use the `--ide` CLI flag and access via `ctx.ide` in setup scripts:

```bash
npm create @m5nv/scaffold my-app -- --template my-template --ide vscode
```

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  const ide = ctx.ide; // 'vscode', 'cursor', etc.

  if (ide === 'vscode') {
    // Configure VS Code settings
  }
}
```

## Validation

Templates are validated against the schema during:
- Template creation (`make-template validate`)
- Project scaffolding (`create-scaffold new`)
- Runtime execution

**Common Validation Errors:**
- Missing required dimensions
- Invalid dimension values
- Gate violations
- Malformed featureSpecs

## Migration from Legacy Schemas

Schema V1.0 replaces the legacy `supportedOptions` format. Key changes:

- **Dimensions** replace `supportedOptions`
- **Gates** replace compatibility matrices
- **FeatureSpecs** provide structured feature metadata
- **Constants** ensure tooling consistency

**Migration Example:**
```json
// Legacy (deprecated)
{
  "supportedOptions": {
    "database": ["sqlite", "postgres"],
    "auth": ["jwt", "session"]
  }
}

// V1.0 (current)
{
  "setup": {
    "dimensions": {
      "database": { "type": "single", "values": ["sqlite", "postgres"], "default": "sqlite" },
      "auth": { "type": "single", "values": ["jwt", "session"], "default": "jwt" }
    }
  }
}
```

## Next Steps

- **[Creating Templates](../how-to/creating-templates.md)** - Template authoring guide
- **[Environment Reference](environment.md)** - Setup script API
- **[CLI Reference](cli-reference.md)** - Command usage including `--ide` flag

## Related Documentation

- [Getting Started Tutorial](../tutorial/getting-started.md) - First project walkthrough
- [create-scaffold Tutorial](../tutorial/create-scaffold.md) - Hands-on examples
- [Author Workflow](../how-to/author-workflow.md) - Template development