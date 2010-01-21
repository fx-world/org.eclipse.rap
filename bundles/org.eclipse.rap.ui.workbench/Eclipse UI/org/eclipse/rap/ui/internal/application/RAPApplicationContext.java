/*******************************************************************************
 * Copyright (c) 2010 EclipseSource and others. All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   EclipseSource - initial API and implementation
 ******************************************************************************/
package org.eclipse.rap.ui.internal.application;

import java.util.HashMap;
import java.util.Map;

import org.eclipse.core.runtime.Platform;
import org.eclipse.equinox.app.IApplicationContext;
import org.osgi.framework.Bundle;

/*
 * Fake context for IApplications
 */
class RAPApplicationContext implements IApplicationContext {

  private final Map arguments = new HashMap(1);
  
  public RAPApplicationContext() {
	  arguments.put( IApplicationContext.APPLICATION_ARGS,
			  		 Platform.getApplicationArgs() );
  }
  
  public void applicationRunning() {
    // do nothing
  }

  public Map getArguments() {
	  return arguments;
  }

  public String getBrandingApplication() {
    return null;
  }

  public Bundle getBrandingBundle() {
    return null;
  }

  public String getBrandingDescription() {
    return null;
  }

  public String getBrandingId() {
    return null;
  }

  public String getBrandingName() {
    return null;
  }

  public String getBrandingProperty( final String key ) {
    return null;
  }
}