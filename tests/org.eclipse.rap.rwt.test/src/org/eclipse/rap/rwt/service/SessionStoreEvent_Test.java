/*******************************************************************************
 * Copyright (c) 2011 EclipseSource and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *    EclipseSource - initial API and implementation
 ******************************************************************************/
package org.eclipse.rap.rwt.service;

import junit.framework.TestCase;

import org.eclipse.rap.rwt.internal.service.SessionStoreImpl;
import org.eclipse.rap.rwt.service.ISessionStore;
import org.eclipse.rap.rwt.service.SessionStoreEvent;
import org.eclipse.rap.rwt.testfixture.TestSession;


public class SessionStoreEvent_Test extends TestCase {
  
  private SessionStoreImpl sessionStore;

  public void testConstructorWithNullArgument() {
    try {
      new SessionStoreEvent( null );
      fail();
    } catch( IllegalArgumentException expected ) {
    }
  }
  
  public void testGetSource() {
    SessionStoreEvent event = new SessionStoreEvent( sessionStore );
    
    Object source = event.getSource();
    
    assertSame( sessionStore, source );
  }
  
  public void testGetSessionStore() {
    SessionStoreEvent event = new SessionStoreEvent( sessionStore );
    
    ISessionStore returnedSessionStore = event.getSessionStore();
    
    assertSame( sessionStore, returnedSessionStore );
  }
  
  protected void setUp() throws Exception {
    sessionStore = new SessionStoreImpl( new TestSession() );
  }
}