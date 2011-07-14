/*******************************************************************************
 * Copyright (c) 2002, 2011 Innoopract Informationssysteme GmbH.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Innoopract Informationssysteme GmbH - initial API and implementation
 *     EclipseSource - ongoing development
 ******************************************************************************/
package org.eclipse.rwt.service;

import org.eclipse.swt.internal.SerializableCompatibility;

/**
 * <code>SessionStoreListener</code>s are
 * used to get notifications before the session store is destroyed.
 * 
 * @since 1.0
 */
public interface SessionStoreListener extends SerializableCompatibility {
  
  /**
   * Notification callback before the session store of interest is
   * destroyed.
   * 
   * @param event the {@link SessionStoreEvent}
   */
  void beforeDestroy( SessionStoreEvent event );
}
