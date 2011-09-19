/*******************************************************************************
 * Copyright (c) 2011 Frank Appel and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *    Frank Appel - initial API and implementation
 ******************************************************************************/
package org.eclipse.rwt.internal.engine;

import java.io.IOException;

import javax.servlet.ServletContext;
import javax.servlet.ServletException;

import junit.framework.TestCase;

import org.eclipse.rap.rwt.testfixture.Fixture;
import org.eclipse.rap.rwt.testfixture.TestServletContext;
import org.eclipse.rwt.Adaptable;
import org.eclipse.rwt.AdapterFactory;
import org.eclipse.rwt.branding.AbstractBranding;
import org.eclipse.rwt.engine.Configurator;
import org.eclipse.rwt.engine.Context;
import org.eclipse.rwt.internal.AdapterManager;
import org.eclipse.rwt.internal.engine.ThemeManagerHelper.TestThemeManager;
import org.eclipse.rwt.internal.engine.configurables.RWTConfigurationConfigurable;
import org.eclipse.rwt.internal.lifecycle.CurrentPhase;
import org.eclipse.rwt.internal.lifecycle.IDisplayLifeCycleAdapter;
import org.eclipse.rwt.internal.resources.JSLibraryServiceHandler;
import org.eclipse.rwt.internal.service.MemorySettingStore;
import org.eclipse.rwt.internal.service.ServiceManager;
import org.eclipse.rwt.internal.textsize.MeasurementListener;
import org.eclipse.rwt.internal.theme.Theme;
import org.eclipse.rwt.internal.uicallback.UICallBackServiceHandler;
import org.eclipse.rwt.lifecycle.*;
import org.eclipse.rwt.resources.IResource;
import org.eclipse.rwt.resources.IResourceManager.RegisterOptions;
import org.eclipse.rwt.service.*;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Display;


public class ContextConfigurable_Test extends TestCase {
  private static final Object ATTRIBUTE_VALUE = new Object();
  private static final String ATTRIBUTE_NAME = "name";
  private static final String THEME_ID = "TestTheme";
  private static final String STYLE_SHEET = "resources/theme/TestExample.css";
  private static final String STYLE_SHEET_2 = "resources/theme/TestExample2.css";

  private TestPhaseListener testPhaseListener;
  private TestSettingStoreFactory testSettingStoreFactory;
  private String entryPointName;
  private TestAdapterFactory testAdapterFactory;
  private TestResource testResource;
  private TestServiceHandler testServiceHandler;
  private String testServiceHandlerId;
  private TestBranding testBranding;
  private ApplicationContext applicationContext;
  private Display display;


  private static class TestPhaseListener implements PhaseListener {
    public void beforePhase( PhaseEvent event ) {
    }

    public void afterPhase( PhaseEvent event ) {
    }

    public PhaseId getPhaseId() {
      return null;
    }
  }
  
  private static class TestSettingStoreFactory implements ISettingStoreFactory {
    public ISettingStore createSettingStore( String storeId ) {
      return new MemorySettingStore( "" );
    }
  }
  
  private static class TestEntryPoint implements IEntryPoint {
    public int createUI() {
      return 0;
    }
  }
  
  private static class TestAdapterFactory implements AdapterFactory {
    public Object getAdapter( Object adaptable, Class adapter ) {
      return new TestAdapter() {};
    }

    public Class[] getAdapterList() {
      return new Class[] { TestAdapter.class };
    }
  }
  
  private static class TestAdaptable implements Adaptable  {
    public Object getAdapter( Class adapter ) {
      return null;
    }
  }
  
  private interface TestAdapter {}
  
  private class TestResource implements IResource {

    public ClassLoader getLoader() {
      return null;
    }

    public String getLocation() {
      return null;
    }

    public String getCharset() {
      return null;
    }

    public RegisterOptions getOptions() {
      return null;
    }

    public boolean isJSLibrary() {
      return false;
    }

    public boolean isExternal() {
      return false;
    }
  }
  
  private static class TestServiceHandler implements IServiceHandler {
    public void service() throws IOException, ServletException {
    }
  }
  
  private static class TestBranding extends AbstractBranding {}
  
  private static class TestWidget extends Composite {
    TestWidget( Composite parent ) {
      super( parent, SWT.NONE );
    }
  }
  
  public void testConfigure() {
    runConfigurator( createConfigurator() );
    
    checkContextDirectoryHasBeenSet();
    checkPhaseListenersHaveBeenAdded();
    checkSettingStoreManagerHasBeenSet();
    checkEntryPointHasBeenAdded();
    checkAdapterFactoriesHaveBeenAdded();
    checkResourceHasBeenAdded();
    checkServiceHandlersHaveBeenAdded();
    checkBrandingHasBeenAdded();
    checkThemeHasBeenAdded();
    checkThemableWidgetHasBeenAdded();
    checkThemeContributionHasBeenAdded();
    checkAttributeHasBeenSet();
  }

  public void testConfigureWithDefaultSettingStoreFactory() {
    runConfigurator( new Configurator() {
      public void configure( Context context ) {
        context.addTheme( THEME_ID, STYLE_SHEET );
      }
    } );
    
    assertTrue( applicationContext.getSettingStoreManager().hasFactory() );
  }
  
  public void testReset() {
    runConfigurator( createConfigurator() );
    
    applicationContext.deactivate();
    
    checkAdapterFactoriesHaveBeenRemoved();
    checkBrandingHasBeenRemoved();
    checkEntryPointHasBeenRemoved();
    checkPhaseListenerHasBeenRemoved();
    checkResourceHasBeenRemoved();
    checkConfigurationHasBeenResetted();
    checkServiceHandlerHasBeenRemoved();
    checkSettingStoreFactoryHasBeenRemoved();
    checkThemeManagerHasBeenResetted();
    checkApplicationStoreHasBeenResetted();
  }

  @Override
  protected void setUp() {
    applicationContext = new ApplicationContext();
    applicationContext.addConfigurable( createConfigurationConfigurable() );
    createDisplay();
    testPhaseListener = new TestPhaseListener();
    testSettingStoreFactory = new TestSettingStoreFactory();
    entryPointName = "entryPoint";
    testAdapterFactory = new TestAdapterFactory();
    testResource = new TestResource();
    testServiceHandler = new TestServiceHandler();
    testServiceHandlerId = "testServiceHandlerId";
    testBranding = new TestBranding();
  }

  private RWTConfigurationConfigurable createConfigurationConfigurable() {
    return new RWTConfigurationConfigurable( new TestServletContext() );
  }

  private void createDisplay() {
    TestServletContext servletContext = Fixture.createServletContext();
    Fixture.createServiceContext();
    ApplicationContextUtil.set( servletContext, applicationContext );
    display = new Display();
    Fixture.disposeOfServiceContext();
    Fixture.disposeOfServletContext();
  }

  private void runConfigurator( Configurator configurator ) {
    ServletContext servletContext = new TestServletContext();
    applicationContext.addConfigurable( new ContextConfigurable( configurator, servletContext ) );
    applicationContext.activate();
  }

  private Configurator createConfigurator() {
    return new Configurator() {
      public void configure( Context context ) {
        context.addEntryPoint( entryPointName, TestEntryPoint.class );
        context.addResource( testResource );
        context.addPhaseListener( testPhaseListener );
        context.addAdapterFactory( TestAdaptable.class, testAdapterFactory );
        context.setSettingStoreFactory( testSettingStoreFactory );
        context.addServiceHandler( testServiceHandlerId, testServiceHandler );
        context.addBranding( testBranding );
        context.addTheme( THEME_ID, STYLE_SHEET );
        context.addThemableWidget( TestWidget.class );
        context.addThemeContribution( THEME_ID, STYLE_SHEET_2 );
        context.setAttribute( ATTRIBUTE_NAME, ATTRIBUTE_VALUE );
      }
    };
  }
  
  private void checkAttributeHasBeenSet() {
    Object attribute = applicationContext.getApplicationStore().getAttribute( ATTRIBUTE_NAME );
    assertSame( ATTRIBUTE_VALUE, attribute );
  }
  
  private void checkThemeContributionHasBeenAdded() {
    Theme theme = applicationContext.getThemeManager().getTheme( THEME_ID );
    assertEquals( 18, theme.getValuesMap().getAllValues().length );
  }

  private void checkThemableWidgetHasBeenAdded() {
    assertNotNull( applicationContext.getThemeManager().getThemeableWidget( TestWidget.class ) );
  }

  private void checkThemeHasBeenAdded() {
    assertNotNull( applicationContext.getThemeManager().getTheme( THEME_ID ) );
  }

  private void checkBrandingHasBeenAdded() {
    assertEquals( 1, applicationContext.getBrandingManager().getAll().length );
    assertSame( testBranding, applicationContext.getBrandingManager().getAll()[ 0 ] );
  }

  private void checkServiceHandlersHaveBeenAdded() {
    ServiceManager serviceManager = applicationContext.getServiceManager();
    assertSame( testServiceHandler, serviceManager.getCustomHandler( testServiceHandlerId ) );
    assertNotNull( serviceManager.getCustomHandler( UICallBackServiceHandler.HANDLER_ID ) );
    assertNotNull( serviceManager.getCustomHandler( JSLibraryServiceHandler.HANDLER_ID ) );
  }

  private void checkResourceHasBeenAdded() {
    assertEquals( 1, applicationContext.getResourceRegistry().get().length );
    assertSame( testResource, applicationContext.getResourceRegistry().get()[ 0 ] );
  }

  private void checkAdapterFactoriesHaveBeenAdded() {
    AdapterManager adapterManager = applicationContext.getAdapterManager();
    Object testAdapter = adapterManager.getAdapter( new TestAdaptable(), TestAdapter.class );
    Object displayAdapter = adapterManager.getAdapter( display, ILifeCycleAdapter.class );
    assertTrue( testAdapter instanceof TestAdapter );
    assertTrue( displayAdapter instanceof IDisplayLifeCycleAdapter );
  }

  private void checkEntryPointHasBeenAdded() {
    assertEquals( 1, applicationContext.getEntryPointManager().getEntryPoints().length );
  }

  private void checkSettingStoreManagerHasBeenSet() {
    assertTrue( applicationContext.getSettingStoreManager().hasFactory() );
  }

  private void checkPhaseListenersHaveBeenAdded() {
    assertEquals( 3, applicationContext.getPhaseListenerRegistry().getAll().length );
    assertEquals( true, findPhaseListener( CurrentPhase.Listener.class ) );
    assertEquals( true, findPhaseListener( MeasurementListener.class ) );
    assertEquals( true, findPhaseListener( TestPhaseListener.class ) );
  }

  private void checkContextDirectoryHasBeenSet() {
    RWTConfiguration configuration = applicationContext.getConfiguration();
    assertEquals( Fixture.WEB_CONTEXT_DIR, configuration.getContextDirectory() );
  }
  
  private void checkAdapterFactoriesHaveBeenRemoved() {
    AdapterManager adapterManager = applicationContext.getAdapterManager();
    Object testAdapter = adapterManager.getAdapter( new TestAdaptable(), TestAdapter.class );
    assertNull( testAdapter );
  }

  private void checkBrandingHasBeenRemoved() {
    assertEquals( 0, applicationContext.getBrandingManager().getAll().length );
  }

  private void checkEntryPointHasBeenRemoved() {
    assertEquals( 0, applicationContext.getEntryPointManager().getEntryPoints().length );
  }

  private void checkPhaseListenerHasBeenRemoved() {
    assertEquals( 0, applicationContext.getPhaseListenerRegistry().getAll().length );
  }

  private void checkResourceHasBeenRemoved() {
    assertEquals( 0, applicationContext.getResourceRegistry().get().length );
  }

  private void checkConfigurationHasBeenResetted() {
    assertFalse( ( ( RWTConfigurationImpl )applicationContext.getConfiguration() ).isConfigured() );
  }

  private void checkServiceHandlerHasBeenRemoved() {
    ServiceManager serviceManager = applicationContext.getServiceManager();
    assertNull( serviceManager.getCustomHandler( testServiceHandlerId ) );
  }

  private void checkSettingStoreFactoryHasBeenRemoved() {
    assertFalse( applicationContext.getSettingStoreManager().hasFactory() );
  }

  private void checkThemeManagerHasBeenResetted() {
    TestThemeManager themeManager = ( TestThemeManager )applicationContext.getThemeManager();
    assertEquals( 0, themeManager.getRegisteredThemeIds().length );
  }
  
  private void checkApplicationStoreHasBeenResetted() {
    Object attribute = applicationContext.getApplicationStore().getAttribute( ATTRIBUTE_NAME );
    assertNull( attribute );
  }

  private boolean findPhaseListener( Class phaseListenerClass ) {
    boolean result = false;
    PhaseListener[] phaseListeners = applicationContext.getPhaseListenerRegistry().getAll();
    for( int i = 0; !result && i < phaseListeners.length; i++ ) {
      if( phaseListeners[ i ].getClass().equals( phaseListenerClass  ) ) {
        result = true;
      }
    }
    return result;
  }
}